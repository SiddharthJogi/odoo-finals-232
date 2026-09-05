import React, { useState, useRef, useEffect } from 'react';
import client from '../api/client';
import {
  Sparkles,
  MessageSquare,
  X,
  Send,
  Bot,
  User,
  AlertCircle,
  TrendingUp,
  PieChart,
  DollarSign,
  Loader2,
} from 'lucide-react';

const SUGGESTED_PROMPTS = [
  { label: 'Total Salary Cost', icon: DollarSign, query: 'What is our total net salary cost this month?' },
  { label: 'Department Breakdown', icon: PieChart, query: 'Show me the salary breakdown by department' },
  { label: 'Compliance Anomalies', icon: AlertCircle, query: 'Scan for salary anomalies and compliance warnings' },
  { label: 'Forecast Next Period', icon: TrendingUp, query: 'What is the projected net salary for next month?' },
];

export default function AiCopilotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Hello! I am your PeoplePay360 AI Copilot. Ask me anything about payroll disbursements, department costs, leave balances, or compliance anomalies.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (customQuery) => {
    const q = customQuery || question;
    if (!q.trim() || loading) return;

    const userMsg = {
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customQuery) setQuestion('');
    setLoading(true);

    try {
      const { data } = await client.post('/ai/query', { question: q });
      const aiMsg = {
        sender: 'ai',
        text: data.answer || 'Query processed.',
        intent: data.intent,
        data: data.data,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Sorry, I encountered an issue connecting to the AI microservice.',
          isError: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-4 py-3 rounded-full shadow-2xl hover:scale-105 transition transform duration-200 border border-white/20"
        >
          <Sparkles className="w-5 h-5 animate-pulse text-amber-300" />
          <span className="text-xs font-extrabold tracking-wide">AI Copilot</span>
        </button>
      )}

      {/* Floating Chat Drawer Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] h-[540px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-white/10 rounded-lg">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="font-bold text-sm">PeoplePay360 Copilot</h3>
                <p className="text-[10px] text-blue-200 font-medium">Odoo-Inspired Intelligence Layer</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/10 rounded-lg text-blue-100 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action Chips */}
          <div className="p-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {SUGGESTED_PROMPTS.map((p, idx) => {
              const IconComp = p.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSend(p.query)}
                  disabled={loading}
                  className="whitespace-nowrap flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-200 hover:border-blue-300 text-gray-700 hover:text-blue-600 text-[11px] font-semibold rounded-full shadow-2xs transition"
                >
                  <IconComp className="w-3 h-3 text-blue-500" />
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0 text-blue-700 font-bold">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-[80%] rounded-2xl p-3 shadow-2xs ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-xs font-medium'
                    : msg.isError
                    ? 'bg-red-50 text-red-800 border border-red-200 rounded-tl-xs'
                    : 'bg-gray-100 text-gray-800 rounded-tl-xs border border-gray-200'
                }`}>
                  <p className="leading-relaxed">{msg.text}</p>
                  <span className={`block text-[9px] mt-1 text-right ${
                    msg.sender === 'user' ? 'text-blue-200' : 'text-gray-400'
                  }`}>
                    {msg.timestamp}
                  </span>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 text-gray-700">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-gray-400 italic font-medium">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                Copilot is analyzing payroll rules...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-gray-200 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask Copilot a question..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
