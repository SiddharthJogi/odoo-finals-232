jest.mock('../performance.repository');

const repo = require('../performance.repository');
const service = require('../performance.service');
const { ValidationError, ForbiddenError } = require('../../../shared/errors');

describe('performance service', () => {
    beforeEach(() => jest.clearAllMocks());

    test('calculates points-based pay with minimum and cap', () => {
        expect(service.calculatePay(70, { minimum_points: 60, point_value: 100, maximum_payout: 5000 })).toBe(5000);
        expect(service.calculatePay(50, { minimum_points: 60, point_value: 100, maximum_payout: 5000 })).toBe(0);
    });

    test('rejects duplicate criteria', async () => {
        repo.findEmployee.mockResolvedValue({ id: 1, status: 'active' });
        repo.listRules.mockResolvedValue([{ id: 1, is_active: true, minimum_points: 0, point_value: 1 }]);
        await expect(service.createReview({
            employee_id: 1, period_start: '2026-01-01', period_end: '2026-01-31', lines: [
                { criterion: 'quality', score: 10 }, { criterion: 'quality', score: 12 },
            ]
        }, 2)).rejects.toThrow(ValidationError);
    });

    test('requires submitted status before approval', async () => {
        repo.findReview.mockResolvedValue({ id: 1, status: 'draft' });
        await expect(service.changeStatus(1, 'approved', 2)).rejects.toThrow(ValidationError);
    });

    test('allows employees to view only their own approved reviews', async () => {
        await expect(service.listEmployeeReviews(9, { role: 'employee', employeeId: 3 })).rejects.toThrow(ForbiddenError);
    });
});
