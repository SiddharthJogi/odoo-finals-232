const https = require('https');
const config = require('../../config');

/**
 * Sleep helper for exponential backoff delay
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Raw HTTPS post request helper
 */
function postJson(urlStr, data) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      const postData = JSON.stringify(data);

      const req = https.request(
        {
          hostname: url.hostname,
          port: url.port || 443,
          path: url.pathname + url.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
          timeout: 10000,
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              resolve({ statusCode: res.statusCode, data: parsed });
            } catch (e) {
              resolve({ statusCode: res.statusCode, raw: body });
            }
          });
        }
      );

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Gemini API timeout (10s)'));
      });

      req.write(postData);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * List of Gemini models in order of priority for high accuracy
 */
function getCandidateModels() {
  const primary = config.geminiModel || 'gemini-2.5-flash';
  const candidates = [primary, 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-flash-latest'];
  return [...new Set(candidates)];
}

/**
 * Format context into structured text for maximum factual precision
 */
function formatContextForAccuracy(contextData) {
  if (!contextData) return 'No context available.';
  return JSON.stringify(contextData, null, 2);
}

/**
 * Generate answer using Google Gemini REST API with high accuracy model, prompt framing, and exponential backoff
 */
async function generateAnswerWithGemini(question, contextData, intent) {
  const apiKey = config.geminiApiKey;
  if (!apiKey) {
    throw new Error('Gemini API key is not configured in .env (GEMINI_API_KEY)');
  }

  const formattedContext = formatContextForAccuracy(contextData);

  const systemInstruction = `You are PeoplePay360 Copilot, an expert AI assistant for HR & Payroll.
Your primary objective is to give 100% ACCURATE, factual answers strictly derived from the provided Data Context.
Guidelines:
1. Always state specific figures, totals, employee counts, or department values accurately.
2. Format money values in Indian Rupees (₹) with proper comma separators (e.g. ₹10,51,560.00).
3. Do NOT make up, assume, or extrapolate facts beyond the provided context.
4. Keep the answer clear and professional. For lists or breakdowns, include every provided row; never stop after a heading or partial sentence.
5. If the context has insufficient history for a forecast, state that clearly and include the latest available figure.`;

  const promptText = `${systemInstruction}

Data Context:
${formattedContext}

User Question: ${question}`;

  const payload = {
    contents: [
      {
        parts: [{ text: promptText }],
      },
    ],
    generationConfig: {
      maxOutputTokens: 1000,
      temperature: 0.1, // Low temperature for high factual accuracy
    },
  };

  const models = getCandidateModels();
  let lastError = null;

  for (const modelName of models) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const maxRetries = 2;
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;
      try {
        const response = await postJson(apiUrl, payload);

        if (response.statusCode === 200 && response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          const answerText = response.data.candidates[0].content.parts[0].text.trim();
          const usage = response.data.usageMetadata || {};
          return {
            answer: answerText,
            modelUsed: modelName,
            tokensIn: usage.promptTokenCount || Math.ceil(promptText.length / 4),
            tokensOut: usage.candidatesTokenCount || Math.ceil(answerText.length / 4),
          };
        }

        // Handle 429 (Rate Limit) or 503 (Service Unavailable)
        if (response.statusCode === 429 || response.statusCode === 503) {
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          console.warn(`[Gemini Client] ${modelName} rate limited (HTTP ${response.statusCode}). Retrying attempt ${attempt}/${maxRetries}...`);
          await sleep(backoffMs);
          continue;
        }

        // If 404 model not found, break retry loop to try next candidate model
        if (response.statusCode === 404) {
          console.warn(`[Gemini Client] Model ${modelName} returned 404, trying next candidate model...`);
          break;
        }

        const errorMsg = response.data?.error?.message || `HTTP status ${response.statusCode}`;
        throw new Error(`Gemini API Error (${modelName}): ${errorMsg}`);
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries && err.message.includes('429')) {
          await sleep(1000);
        } else {
          break;
        }
      }
    }
  }

  throw lastError || new Error('Failed to generate answer from Gemini API');
}

module.exports = {
  generateAnswerWithGemini,
};
