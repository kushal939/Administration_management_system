# Fees System - Quick Reference Guide

## Quick Start

### Access
Navigate to **Fees** section from the dashboard

### Three Views
1. **List** - Manage all fees
2. **Analytics** - View financial reports
3. **Templates** - Manage fee templates

## Common Tasks

### Create a Single Fee
```
1. Click "+ Add Fee"
2. Enter Student ID (e.g., 001)
3. Enter Amount (e.g., 5000)
4. Add Description (optional)
5. Select Category
6. Set Due Date (optional)
7. Click "Create"
```

### Create Bulk Fees
```
1. Click "Bulk Create"
2. Select Target:
   - All Students
   - By Department
   - By Course
3. Enter Amount
4. Add Description
5. Select Category
6. Set Due Date
7. Click "Create Bulk"
```

### Record a Payment
```
1. Find unpaid fee in list
2. Click "Pay" button
3. Select Payment Method:
   - Cash
   - Online Transfer
   - Cheque
   - Card
4. Enter Transaction ID (optional)
5. Set Payment Date
6. Add Notes (optional)
7. Click "Record Payment"
```

### Create Installment Plan
```
1. Find large unpaid fee
2. Click "Split" button
3. Enter Number of Installments (2-12)
4. Set Start Date
5. Click "Create Installments"
Note: Original fee will be deleted
```

### Create Fee Template
```
1. Switch to "Templates" view
2. Click "+ Create Template"
3. Enter Template Name
4. Enter Amount
5. Add Description
6. Select Category
7. Set Default Due Days
8. Click "Create Template"
```

### Apply Template
```
1. Go to Templates view
2. Find template
3. Click "Apply to Students"
4. Select Target:
   - All Students
   - By Department
5. Click "Apply Template"
```

## Filtering & Search

### Search
- Type in search box
- Searches: Student name, ID, description

### Filters
- **Category**: Select from dropdown
- **Status**: All / Paid / Unpaid
- **Overdue**: Check box to show only overdue

### Clear Filters
- Set Category to "All"
- Set Status to "All"
- Uncheck Overdue
- Clear search box

## Understanding Status

| Status | Color | Meaning |
|--------|-------|---------|
| Paid | Green | Payment received |
| Unpaid | Yellow | Not yet paid |
| Overdue | Red | Past due date |

## Analytics Dashboard

### Summary Cards
1. **Total Amount** - All fees combined
2. **Paid** - Successfully collected
3. **Unpaid** - Pending collection
4. **Overdue** - Past due date

### Category Breakdown
- Shows fees by category
- Paid vs unpaid per category
- Record count per category

### Recent Payments
- Last 10 payments
- Transaction details
- Payment methods

## Fee Categories

| Category | Use For |
|----------|---------|
| Tuition | Semester/course fees |
| Bus | Transport fees |
| Library | Library charges |
| Lab | Laboratory fees |
| Hostel | Accommodation |
| Exam | Examination fees |
| Sports | Sports activities |
| General | Other fees |

## Keyboard Shortcuts

- `Esc` - Close any modal
- `Enter` - Submit form (when focused)
- `Tab` - Navigate form fields

## Tips & Best Practices

### For Bulk Operations
✓ Use templates for recurring fees
✓ Apply bulk fees at semester start
✓ Set realistic due dates

### For Payment Tracking
✓ Always enter transaction ID
✓ Add notes for reference
✓ Record payment date accurately

### For Installments
✓ Use for fees > Rs. 5,000
✓ Maximum 12 installments
✓ Start date = first payment due

### For Templates
✓ Create templates for common fees
✓ Use descriptive names
✓ Set appropriate due days

## Troubleshooting

### Fee Not Showing
- Check filters
- Clear search term
- Refresh page

### Can't Record Payment
- Verify fee is unpaid
- Check student ID exists
- Ensure amount is correct

### Template Not Applying
- Verify students exist
- Check department/course filter
- Ensure template has amount

### Overdue Not Showing
- Check due date is past
- Verify fee is unpaid
- Enable overdue filter

## Role Permissions

### Admin
✅ Create fees
✅ Edit fees
✅ Delete fees
✅ Record payments
✅ Create bulk fees
✅ Manage templates
✅ View analytics

### Teacher
✅ View fees
✅ Record payments
✅ View analytics
❌ Create/edit/delete fees
❌ Bulk operations
❌ Templates

### Student
✅ View own fees
✅ View payment history
❌ All admin functions

## API Endpoints (For Developers)

```
GET    /api/fees                    - List all fees
GET    /api/fees/analytics          - Get analytics
GET    /api/fees/student/:id        - Student fees
POST   /api/fees                    - Create fee
POST   /api/fees/bulk               - Bulk create
PUT    /api/fees/:id                - Update fee
DELETE /api/fees/:id                - Delete fee
POST   /api/fees/:id/pay            - Record payment
POST   /api/fees/:id/installment    - Create installments
GET    /api/fees/templates          - List templates
POST   /api/fees/templates          - Create template
POST   /api/fees/templates/:id/apply - Apply template
```

## Quick Stats

- **8** Fee categories
- **4** Payment methods
- **3** View modes
- **7** Modal dialogs
- **10** API endpoints
- **2-12** Installment options

## Support

For issues or questions:
1. Check this guide
2. Review ADVANCED_FEES_SYSTEM.md
3. Check FEES_SYSTEM_COMPLETE.md
4. Contact system administrator

---

**Last Updated**: February 24, 2026
**Version**: 2.0.0
