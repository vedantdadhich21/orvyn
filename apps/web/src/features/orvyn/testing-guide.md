# ORVYN Portfolio Builder Testing Guide

## Introduction

This guide provides structured test cases to help you identify and break potential issues in the ORVYN portfolio builder. Follow these scenarios to test the application thoroughly.

## Test Categories

### 1. Weight Calculation Issues

#### Test Case 1.1: Weights Not Adding Up
- **Steps**: 
  1. Create a strategy with multiple assets
  2. Set allocations that don't add up to 100%
  3. Try to save/review the strategy
  4. Add assets until weights exceed 100%
- **Expected**: System should validate and prevent saving invalid allocations
- **Report If**: Strategy saves with invalid weights or allows inconsistent allocations

#### Test Case 1.2: Allocation Validation Bypass
- **Steps**: 
  1. Create a strategy
  2. Use browser dev tools to modify allocation values
  3. Try to save the strategy
  4. Test with edge cases (negative values, extremely large values)
- **Expected**: System should reject invalid values
- **Report If**: Invalid allocations are accepted

### 2. Drift Handling Issues

#### Test Case 2.1: Drift Not Closing After Rebalance
- **Steps**: 
  1. Create a strategy with a price band
  2. Simulate price movement outside the band
  3. Trigger a rebalance
  4. Monitor if drift is properly closed
- **Expected**: Drift should be closed after rebalance
- **Report If**: Drift persists after rebalance or rebalance fails

#### Test Case 2.2: Band Calculation Errors
- **Steps**: 
  1. Create strategies with different band widths
  2. Test extreme band values (very narrow/very wide)
  3. Verify band calculations match expected values
- **Expected**: Band calculations should be mathematically correct
- **Report If**: Band calculations don't match expected values

### 3. Draft Persistence Issues

#### Test Case 3.1: Draft Lost on Refresh
- **Steps**: 
  1. Start creating a strategy
  2. Save as draft
  3. Refresh the page
  4. Check if draft is restored
- **Expected**: Draft should be restored after refresh
- **Report If**: Draft is lost or corrupted on refresh

#### Test Case 3.2: Multiple Draft Conflicts
- **Steps**: 
  1. Create multiple strategy drafts
  2. Switch between drafts
  3. Modify one draft
  4. Check if other drafts are affected
- **Expected**: Drafts should be independent
- **Report If**: Modifying one draft affects others

### 4. Malformed Strategy Handling

#### Test Case 4.1: Invalid Strategy Input
- **Steps**: 
  1. Try to import a strategy with malformed data
  2. Test with missing required fields
  3. Test with invalid data types
- **Expected**: System should handle malformed data gracefully
- **Report If**: System crashes or behaves unpredictably with bad data

#### Test Case 4.2: Gallery Strategy Corruption
- **Steps**: 
  1. Find a strategy in the gallery
  2. Try to modify the strategy URL to introduce errors
  3. Attempt to load the corrupted strategy
- **Expected**: System should reject malformed gallery strategies
- **Report If**: System loads or attempts to execute corrupted strategies

### 5. UI/UX Issues

#### Test Case 5.1: Keyboard Navigation
- **Steps**: 
  1. Navigate through the entire app using only keyboard
  2. Test all interactive elements
  3. Check focus indicators
- **Expected**: Full keyboard accessibility
- **Report If**: Elements can't be accessed via keyboard or focus is lost

#### Test Case 5.2: Contrast and Layout
- **Steps**: 
  1. Test on different screen sizes
  2. Check color contrast ratios
  3. Test with different device orientations
  4. Test with zoom in/out
- **Expected**: Responsive layout with good contrast
- **Report If**: Layout breaks or contrast is poor

#### Test Case 5.3: Component Spacing
- **Steps**: 
  1. Verify consistent spacing between elements
  2. Check alignment of related components
  3. Test with different font sizes
- **Expected**: Consistent, well-aligned UI
- **Report If**: Inconsistent spacing or misaligned elements

### 6. Data Inconsistencies

#### Test Case 6.1: Figure Discrepancies
- **Steps**: 
  1. Create a strategy
  2. Compare values across different displays
  3. Check if same data appears consistently
- **Expected**: Same data should appear consistently across all views
- **Report If**: Same data shows different values in different places

#### Test Case 6.2: Real-time Data Synchronization
- **Steps**: 
  1. Open strategy in multiple tabs/windows
  2. Modify data in one view
  3. Check if other views update
- **Expected**: All views should stay synchronized
- **Report If**: Data becomes out of sync between views

## Bug Reporting

When you find an issue, report it using the bug form with:
1. **Screen**: Screenshot or screen recording
2. **Steps**: Detailed reproduction steps
3. **Expected**: What should have happened
4. **Actual**: What actually happened
5. **Browser**: Browser version and device

## Testing Tips

- Test in different browsers (Chrome, Safari, Firefox)
- Test on different devices (mobile, tablet, desktop)
- Test with different network conditions
- Test edge cases and boundary conditions
- Test concurrent operations

Happy testing!