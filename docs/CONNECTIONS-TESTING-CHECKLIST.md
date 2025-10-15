# Connections Feature - Testing Checklist

## Overview
This document provides a comprehensive testing checklist for the Connections management feature, covering all CRUD operations and UI interactions.

**Test Environment**: http://localhost:5178

## Prerequisites
- ✅ Development server running on port 5178
- ✅ Supabase backend configured and running
- ✅ User authenticated in the application
- ✅ At least one workspace created

---

## 1. CREATE Operations

### 1.1 Basic Connection Creation
- [ ] Navigate to Connections page
- [ ] Click "New Connection" button
- [ ] Verify CreateConnectionDialog opens
- [ ] Enter connection name (e.g., "Test MSSQL Connection")
- [ ] Select "MSSQL" from Connection Type dropdown
- [ ] Verify dropdown arrow has proper padding on the right
- [ ] Add optional description
- [ ] Click "Continue" button
- [ ] Verify MSSQLConnectionEditor opens

### 1.2 MSSQL Connection Editor - Basic Tab
- [ ] Verify "Basic Settings" tab is active by default
- [ ] Enter server name (e.g., "localhost")
- [ ] Select authentication type from dropdown
- [ ] Verify dropdown arrow has proper padding on the right
- [ ] Test each authentication type:
  - [ ] Windows Authentication (no credentials needed)
  - [ ] SQL Server Authentication (requires username/password)
  - [ ] Azure AD Password (requires username/password)
  - [ ] Azure AD Integrated (no credentials needed)

### 1.3 Test Connection Feature
- [ ] Fill in server and authentication details
- [ ] Verify "Test Connection" button is enabled
- [ ] Click "Test Connection"
- [ ] Verify button shows "Testing..." with spinning icon
- [ ] Verify success message appears with green checkmark
- [ ] Verify error handling (test with invalid credentials)

### 1.4 Dynamic Database Dropdown
- [ ] After entering server and auth, verify databases start loading automatically
- [ ] Verify database dropdown shows loading spinner
- [ ] Verify dropdown populates with available databases
- [ ] Verify dropdown arrow has proper padding on the right
- [ ] Select a database from dropdown
- [ ] Click "Enter custom name" toggle
- [ ] Verify input field appears for custom database name
- [ ] Enter custom database name
- [ ] Click "Select from list" toggle
- [ ] Verify dropdown reappears

### 1.5 MSSQL Connection Editor - Advanced Tab
- [ ] Click "Advanced Settings" tab
- [ ] Verify all advanced fields are visible:
  - [ ] Port number field
  - [ ] Connection timeout field
  - [ ] Command timeout field
  - [ ] Enable SSL toggle
  - [ ] Trust Server Certificate toggle
  - [ ] Enable CDC toggle
  - [ ] Custom connection string field
- [ ] Modify advanced settings
- [ ] Verify values persist when switching tabs

### 1.6 Save Connection
- [ ] Switch back to Basic tab
- [ ] Verify connection name is pre-filled
- [ ] Click "Save" button
- [ ] Verify success message/feedback
- [ ] Verify dialog closes
- [ ] Verify new connection appears in connections list

### 1.7 Connection Card Display
- [ ] Verify connection card shows:
  - [ ] Database icon
  - [ ] Connection name
  - [ ] Description (if provided)
  - [ ] Connection type badge (MSSQL)
  - [ ] Test status indicator
  - [ ] "Test Connection" button
  - [ ] Three-dot menu button
  - [ ] Last tested date (in footer)

---

## 2. READ Operations

### 2.1 Connections List
- [ ] Navigate to Connections page
- [ ] Verify all connections are displayed
- [ ] Verify loading skeletons appear while fetching
- [ ] Verify empty state message if no connections
- [ ] Verify error state with retry button

### 2.2 Search Functionality
- [ ] Enter search term in search box
- [ ] Verify connections filter in real-time
- [ ] Verify "No connections found" message for no matches
- [ ] Clear search and verify all connections reappear

### 2.3 Type Filter
- [ ] Select "MSSQL" from type filter dropdown
- [ ] Verify dropdown arrow has proper padding on the right
- [ ] Verify only MSSQL connections are shown
- [ ] Select "All Types"
- [ ] Verify all connections reappear

### 2.4 Connection Details
- [ ] Click on a connection card
- [ ] Verify connection details are accurate
- [ ] Verify test status is displayed correctly
- [ ] Verify last tested timestamp is accurate

---

## 3. UPDATE Operations

### 3.1 Edit Connection - Basic Info
- [ ] Click three-dot menu on a connection card
- [ ] Click "Edit" option
- [ ] Verify EditConnectionDialog opens
- [ ] Verify connection name is pre-filled
- [ ] Verify description is pre-filled
- [ ] Verify connection type is displayed (read-only)
- [ ] Modify connection name
- [ ] Modify description
- [ ] Click "Continue" button

### 3.2 Edit Connection - MSSQL Configuration
- [ ] Verify MSSQLConnectionEditor opens in edit mode
- [ ] Verify all existing configuration is pre-filled:
  - [ ] Server name
  - [ ] Authentication type
  - [ ] Username/password (if applicable)
  - [ ] Database name
  - [ ] Port
  - [ ] Timeouts
  - [ ] SSL settings
  - [ ] CDC setting
  - [ ] Connection string

### 3.3 Update MSSQL Configuration
- [ ] Modify server name
- [ ] Change authentication type
- [ ] Update database selection
- [ ] Click "Test Connection" to verify changes
- [ ] Switch to Advanced tab
- [ ] Modify advanced settings
- [ ] Switch back to Basic tab
- [ ] Click "Save"
- [ ] Verify success feedback
- [ ] Verify dialog closes
- [ ] Verify connection card shows updated information

### 3.4 Edit Non-MSSQL Connection (Future)
- [ ] For other connection types, verify only name and description can be edited
- [ ] Verify "Save Changes" button (not "Continue")
- [ ] Verify changes are saved immediately

---

## 4. DELETE Operations

### 4.1 Delete Connection
- [ ] Click three-dot menu on a connection card
- [ ] Click "Delete" option
- [ ] Verify DeleteConnectionDialog opens
- [ ] Verify connection name is displayed
- [ ] Verify warning message is clear
- [ ] Click "Cancel"
- [ ] Verify dialog closes without deleting

### 4.2 Confirm Delete
- [ ] Open delete dialog again
- [ ] Click "Delete" button
- [ ] Verify loading state while deleting
- [ ] Verify success feedback
- [ ] Verify dialog closes
- [ ] Verify connection is removed from list
- [ ] Verify list refreshes automatically

---

## 5. TEST CONNECTION Operations

### 5.1 Test from Connection Card
- [ ] Click "Test Connection" button on connection card
- [ ] Verify button shows "Testing..." state
- [ ] Verify button is disabled during test
- [ ] Verify test result updates connection status
- [ ] Verify status icon updates (green checkmark for success)
- [ ] Verify "Last tested" timestamp updates

### 5.2 Test from Editor
- [ ] Open connection in edit mode
- [ ] Click "Test Connection" in editor
- [ ] Verify test executes
- [ ] Verify success/error message appears
- [ ] Verify databases load automatically on success

---

## 6. UI/UX Validation

### 6.1 Responsive Design
- [ ] Test on different screen sizes
- [ ] Verify dialogs are properly centered
- [ ] Verify dialog fits on screen (max-h-[95vh])
- [ ] Verify grid layout adjusts (1/2/3 columns)
- [ ] Verify mobile-friendly touch targets

### 6.2 Form Validation
- [ ] Try to create connection without name
- [ ] Verify required field validation
- [ ] Try to save without required fields
- [ ] Verify error messages are clear
- [ ] Verify field highlighting for errors

### 6.3 Loading States
- [ ] Verify loading spinners during:
  - [ ] Connection list fetch
  - [ ] Connection creation
  - [ ] Connection update
  - [ ] Connection deletion
  - [ ] Connection test
  - [ ] Database list loading
- [ ] Verify buttons are disabled during operations
- [ ] Verify smooth transitions

### 6.4 Error Handling
- [ ] Test with invalid server name
- [ ] Test with incorrect credentials
- [ ] Test with network disconnection
- [ ] Verify error messages are user-friendly
- [ ] Verify errors don't crash the UI

### 6.5 Dropdown Padding
- [ ] Verify all dropdowns have proper right padding:
  - [ ] Connection Type in CreateConnectionDialog
  - [ ] Authentication Type in MSSQLConnectionEditor
  - [ ] Database dropdown in MSSQLConnectionEditor
  - [ ] Type filter in ConnectionsPage
- [ ] Verify dropdown arrows don't overlap with text

---

## 7. Integration Tests

### 7.1 React Query Integration
- [ ] Verify optimistic updates work correctly
- [ ] Verify cache invalidation after mutations
- [ ] Verify stale-while-revalidate behavior
- [ ] Verify proper error rollback

### 7.2 Supabase Integration
- [ ] Verify RLS policies are enforced
- [ ] Verify only workspace connections are shown
- [ ] Verify user can only edit their connections
- [ ] Verify encryption of sensitive data

### 7.3 Navigation
- [ ] Navigate between Connections and other pages
- [ ] Verify state persists (search, filters)
- [ ] Verify back button works correctly
- [ ] Verify deep linking to connections page

---

## 8. Performance Tests

### 8.1 Large Datasets
- [ ] Test with 50+ connections
- [ ] Verify smooth scrolling
- [ ] Verify search is responsive
- [ ] Verify pagination (if implemented)

### 8.2 Network Conditions
- [ ] Test with slow 3G simulation
- [ ] Verify loading states are adequate
- [ ] Verify timeout handling
- [ ] Test offline behavior

---

## 9. Accessibility Tests

### 9.1 Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Verify focus indicators are visible
- [ ] Test Enter key for form submission
- [ ] Test Escape key for dialog close

### 9.2 Screen Reader
- [ ] Verify form labels are announced
- [ ] Verify error messages are announced
- [ ] Verify status changes are announced
- [ ] Verify ARIA attributes are correct

---

## 10. Security Tests

### 10.1 Input Sanitization
- [ ] Test with SQL injection patterns
- [ ] Test with XSS patterns
- [ ] Verify input is properly escaped
- [ ] Verify no sensitive data in console logs

### 10.2 Authentication
- [ ] Verify unauthenticated users can't access
- [ ] Verify session timeout handling
- [ ] Verify proper logout behavior

---

## Known Issues / TODO

### TODO: Backend Integration
- [ ] Replace mock test connection with Supabase Edge Function
- [ ] Replace mock database loading with actual SQL query
- [ ] Implement proper error handling for SQL Server-specific errors
- [ ] Add connection pooling configuration

### TODO: Future Enhancements
- [ ] Add connection cloning feature
- [ ] Add bulk delete functionality
- [ ] Add connection health monitoring
- [ ] Add connection usage analytics
- [ ] Add favorite/star connections

---

## Test Results Summary

| Category | Pass | Fail | Skip | Notes |
|----------|------|------|------|-------|
| Create   |      |      |      |       |
| Read     |      |      |      |       |
| Update   |      |      |      |       |
| Delete   |      |      |      |       |
| UI/UX    |      |      |      |       |
| Integration |   |      |      |       |
| Performance |   |      |      |       |
| Accessibility | |      |      |       |
| Security |      |      |      |       |

---

## Sign-off

- [ ] All critical tests passed
- [ ] All blockers resolved
- [ ] Documentation updated
- [ ] Ready for deployment

**Tested by**: _________________
**Date**: _________________
**Version**: _________________
