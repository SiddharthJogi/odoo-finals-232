// Mock dependencies
jest.mock('../../../config', () => ({}));
jest.mock('../../../db');
jest.mock('../payroll.repository');

const service = require('../payroll.service');
const repo = require('../payroll.repository');
const db = require('../../../db');
const { NotFoundError, ValidationError } = require('../../../shared/errors');

describe('payroll.service - Payrun Transitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock db client
    const mockClient = {
      query: jest.fn().mockResolvedValue({}),
      release: jest.fn()
    };
    db.getClient.mockResolvedValue(mockClient);
  });

  it('should transition payrun from draft to computed', async () => {
    repo.findPayrunById.mockResolvedValue({ id: 1, status: 'draft' });
    repo.updatePayrunStatus.mockResolvedValue({ id: 1, status: 'computed' });
    repo.updatePayslipStatus.mockResolvedValue();

    const result = await service.transitionPayrun(1, 'computed');

    expect(repo.findPayrunById).toHaveBeenCalledWith(1);
    expect(repo.updatePayrunStatus).toHaveBeenCalled();
    expect(repo.updatePayslipStatus).toHaveBeenCalled();
    expect(result.status).toBe('computed');
  });

  it('should transition payrun from computed to validated', async () => {
    repo.findPayrunById.mockResolvedValue({ id: 1, status: 'computed' });
    repo.updatePayrunStatus.mockResolvedValue({ id: 1, status: 'validated' });

    const result = await service.transitionPayrun(1, 'validated');
    expect(result.status).toBe('validated');
  });

  it('should transition payrun from validated to paid', async () => {
    repo.findPayrunById.mockResolvedValue({ id: 1, status: 'validated' });
    repo.updatePayrunStatus.mockResolvedValue({ id: 1, status: 'paid' });

    const result = await service.transitionPayrun(1, 'paid');
    expect(result.status).toBe('paid');
  });

  it('should throw ValidationError if transition is invalid (e.g., draft to validated)', async () => {
    repo.findPayrunById.mockResolvedValue({ id: 1, status: 'draft' });

    await expect(service.transitionPayrun(1, 'validated')).rejects.toThrow(ValidationError);
    await expect(service.transitionPayrun(1, 'validated')).rejects.toThrow("Cannot transition payrun from 'draft' to 'validated'");
    
    expect(repo.updatePayrunStatus).not.toHaveBeenCalled();
  });

  it('should throw NotFoundError if payrun does not exist', async () => {
    repo.findPayrunById.mockResolvedValue(null);

    await expect(service.transitionPayrun(999, 'computed')).rejects.toThrow(NotFoundError);
  });
});
