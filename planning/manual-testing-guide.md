# Manual Testing Guide - Recruiting Compass MVP

**Purpose**: Systematically verify that each user story meets acceptance criteria through manual testing.

**Scope**: All 30 stories across 10 epics (MVP features)

**Platform**: Platform-agnostic; applicable to web and iOS

**Format**: Each story includes scenario-by-scenario test steps with verification checkpoints.

---

## Testing Instructions

### For Each Story:

1. **Read the scenario** carefully
2. **Execute the test steps** in order
3. **Verify the expected outcome** matches actual result
4. **Mark PASS or FAIL** in the checkbox
5. **Document any issues** in the Notes column

### Sign-Off

Once all scenarios in a story pass, mark the story as **APPROVED** with:

- ✅ Date tested
- ✅ Tester name
- ✅ Any edge cases discovered

---

## EPIC 1: ACCOUNT MANAGEMENT (Stories 1.1 - 1.4)

### Story 1.1: Parent Creates Account

**As a parent, I want to create an account with email and password so I can start organizing my athlete's recruiting.**

#### Scenario 1: Valid signup

- [ ] Navigate to signup page
- [ ] Enter valid email address (e.g., parent@example.com)
- [ ] Enter password with 8+ characters, mixed case & numbers
- [ ] Click "Create Account"
- [ ] **Verify**: Account created, redirected to email verification page
- [ ] **Verify**: Verification email received within 1 minute
- [ ] Click verification link in email
- [ ] **Verify**: Email confirmed, account activated
- [ ] Can login with new credentials

**Notes**: ********\_********

#### Scenario 2: Duplicate email error

- [ ] Attempt to signup with email already in system
- [ ] **Verify**: Error message "Email already in use" displays
- [ ] **Verify**: Account not created
- [ ] Can see password reset/login links in error message

**Notes**: ********\_********

#### Scenario 3: Password validation

- [ ] Navigate to signup page
- [ ] Enter password with less than 8 characters
- [ ] **Verify**: Error message "Password must be at least 8 characters" displays
- [ ] **Verify**: Signup button is disabled
- [ ] Enter valid password (8+ chars)
- [ ] **Verify**: Signup button becomes enabled

**Notes**: ********\_********

#### Scenario 4: Email format validation

- [ ] Try invalid email formats (test@, test@.com, etc.)
- [ ] **Verify**: Error message displays for invalid format
- [ ] Enter valid email format
- [ ] **Verify**: Error clears, form proceeds normally

**Notes**: ********\_********

#### Acceptance Criteria Checklist

- [ ] Signup completes in under 2 minutes
- [ ] Verification email within 1 minute
- [ ] Password min 8 characters enforced
- [ ] Email format validation works
- [ ] Duplicate email prevention works
- [ ] Passwords securely hashed (check via admin panel/database)

**Story 1.1 Status**: ☐ PASS ☐ FAIL | Date: **\_** | Tester: ****\_\_\_****

---

### Story 1.2: Parent Logs In Securely

**As a parent, I want to log in with my email and password so I can access my family's recruiting information securely.**

#### Scenario 1: Successful login

- [ ] Navigate to login page
- [ ] Enter verified email address
- [ ] Enter correct password
- [ ] Click "Log In"
- [ ] **Verify**: Logged in successfully
- [ ] **Verify**: Redirected to dashboard
- [ ] **Verify**: Dashboard shows user's data

**Notes**: ********\_********

#### Scenario 2: Incorrect password

- [ ] Navigate to login page
- [ ] Enter correct email
- [ ] Enter wrong password
- [ ] Click "Log In"
- [ ] **Verify**: Error message "Invalid email or password" displays (generic, not revealing which is wrong)
- [ ] **Verify**: Remain on login page, not logged in

**Notes**: ********\_********

#### Scenario 3: Remember Me checkbox

- [ ] Navigate to login page
- [ ] Check "Remember me on this device" checkbox
- [ ] Enter correct credentials
- [ ] Click "Log In"
- [ ] **Verify**: Logged in successfully
- [ ] Close browser completely
- [ ] Reopen browser, navigate to app
- [ ] **Verify**: Still logged in without re-entering credentials
- [ ] Wait 30 days (or fast-forward in system if possible)
- [ ] **Verify**: Session expires and login required

**Notes**: ********\_********

#### Scenario 4: Session timeout

- [ ] Login successfully
- [ ] Leave app inactive for 30+ days (or use system time override)
- [ ] Navigate to protected page
- [ ] **Verify**: Logged out, redirected to login page
- [ ] **Verify**: Message "Your session has expired" or similar

**Notes**: ********\_********

#### Acceptance Criteria Checklist

- [ ] Login succeeds with correct credentials
- [ ] Login fails with error on incorrect password
- [ ] Remember Me persists session 30 days
- [ ] Session expires after 30 days inactivity
- [ ] HTTPS enforced (check URL bar)
- [ ] Error message doesn't reveal which field is incorrect

**Story 1.2 Status**: ☐ PASS ☐ FAIL | Date: **\_** | Tester: ****\_\_\_****

---

### Story 1.3: Parent Invites Secondary User

**As a parent, I want to invite my spouse to view my family's account so we can both stay informed.**

#### Scenario 1: Send invitation

- [ ] Login as parent
- [ ] Navigate to Account Settings
- [ ] Click "Invite Secondary User" (or "Invite Family Member")
- [ ] Enter spouse's email address
- [ ] Click "Send Invitation"
- [ ] **Verify**: Message "Invitation sent" displays
- [ ] **Verify**: Email sent to spouse's address within 1 minute
- [ ] **Verify**: Invitation listed in settings with "Pending" status

**Notes**: ********\_********

#### Scenario 2: Secondary user accepts invitation

- [ ] Open invitation email
- [ ] Click "Accept Invitation" link
- [ ] **Verify**: App opens/redirects to acceptance page
- [ ] Set up password for account
- [ ] Click "Accept"
- [ ] **Verify**: Secondary user added to account
- [ ] Can login with own credentials
- [ ] **Verify**: Can access all data from primary account

**Notes**: ********\_********

#### Scenario 3: Secondary user read-only access

- [ ] Login as secondary user
- [ ] Navigate to dashboard/schools/interactions
- [ ] **Verify**: Can view all data
- [ ] Try to edit a school name, note, or interaction
- [ ] **Verify**: Edit button disabled or hidden
- [ ] **Verify**: "Read-Only Access" indicator visible on page

**Notes**: ********\_********

#### Scenario 4: Primary user removes secondary user

- [ ] Login as primary user
- [ ] Navigate to Account Settings
- [ ] Find secondary user in list
- [ ] Click "Remove User"
- [ ] **Verify**: Confirmation dialog appears
- [ ] Confirm removal
- [ ] **Verify**: Secondary user removed from account
- [ ] Login as removed secondary user
- [ ] **Verify**: Access denied, message "Access revoked"

**Notes**: ********\_********

#### Scenario 5: Duplicate invitation prevention

- [ ] Invite same email twice
- [ ] **Verify**: Warning "Invitation already sent to this email" or similar
- [ ] **Verify**: Second invitation not created

**Notes**: ********\_********

#### Acceptance Criteria Checklist

- [ ] Can invite up to 5 secondary users
- [ ] Secondary users receive email within 1 minute
- [ ] Secondary users can only view, not edit
- [ ] Primary user can revoke access
- [ ] Secondary user clearly labeled in UI
- [ ] Cannot add duplicate invitations

**Story 1.3 Status**: ☐ PASS ☐ FAIL | Date: **\_** | Tester: ****\_\_\_****

---

### Story 1.4: Parent Resets Forgotten Password

**As a parent, I want to reset my password if I forget it so I can regain access to my account.**

#### Scenario 1: Initiate password reset

- [ ] Navigate to login page
- [ ] Click "Forgot Password?"
- [ ] Enter registered email address
- [ ] Click "Send Reset Link"
- [ ] **Verify**: Message "Check your email for reset instructions"
- [ ] **Verify**: Reset email sent within 5 minutes

**Notes**: ********\_********

#### Scenario 2: Use reset link

- [ ] Open password reset email
- [ ] Click reset link
- [ ] **Verify**: Link is valid (not expired)
- [ ] **Verify**: Taken to password reset page
- [ ] **Verify**: Page asks for new password (not old password)

**Notes**: ********\_********

#### Scenario 3: Complete password reset

- [ ] On password reset page
- [ ] Enter new password (8+ chars)
- [ ] Confirm new password (must match)
- [ ] Click "Reset Password"
- [ ] **Verify**: Password updated successfully
- [ ] **Verify**: Redirected to login page
- [ ] **Verify**: Can login with new password
- [ ] Old password no longer works

**Notes**: ********\_********

#### Scenario 4: Reset link expiration

- [ ] Request password reset
- [ ] Wait 24+ hours (or use system time override)
- [ ] Click reset link
- [ ] **Verify**: Error "This reset link has expired"
- [ ] **Verify**: Can request new reset link from error page

**Notes**: ********\_********

#### Scenario 5: Password reset validation

- [ ] Request password reset
- [ ] Click reset link
- [ ] Try password with less than 8 characters
- [ ] **Verify**: Error "Password must be at least 8 characters"
- [ ] **Verify**: Reset button disabled
- [ ] Enter valid password
- [ ] **Verify**: Button enabled, reset succeeds

**Notes**: ********\_********

#### Acceptance Criteria Checklist

- [ ] Reset email sent within 5 minutes
- [ ] Reset link valid for 24 hours only
- [ ] New password meets same requirements as signup
- [ ] Old password not required to reset
- [ ] Can login immediately with new password
- [ ] Link expires after 24 hours

**Story 1.4 Status**: ☐ PASS ☐ FAIL | Date: **\_** | Tester: ****\_\_\_****

---

## EPIC 2: ATHLETE PROFILE (Stories 2.1 - 2.2)

### Story 2.1: Parent Creates Athlete Profile

**As a parent, I want to set up my athlete's profile with basic information so the app can generate personalized timeline and suggestions.**

#### Scenario 1: Create profile with required fields

- [ ] Login as parent
- [ ] Click "Add Athlete" or similar
- [ ] Fill required fields:
  - [ ] Athlete Name: "John Smith"
  - [ ] Graduation Year: "2026"
  - [ ] Position: "Pitcher"
  - [ ] Height: "6'2\""
  - [ ] Weight: "190 lbs"
- [ ] Click "Create Profile"
- [ ] **Verify**: Profile created for John Smith
- [ ] **Verify**: Redirected to athlete dashboard
- [ ] **Verify**: Profile data displays correctly

**Notes**: ********\_********

#### Scenario 2: Add optional athletic information

- [ ] Edit athlete profile
- [ ] Add optional fields:
  - [ ] Secondary Position: "Outfield"
  - [ ] Jersey Number: "14"
  - [ ] NCSA Athlete ID: "12345"
- [ ] Save profile
- [ ] **Verify**: Optional information stored
- [ ] **Verify**: Can view and edit later

**Notes**: ********\_********

#### Scenario 3: Add academic information

- [ ] Edit athlete profile
- [ ] Navigate to "Academics" section
- [ ] Enter:
  - [ ] Unweighted GPA: "3.4"
  - [ ] Weighted GPA: "3.7"
  - [ ] SAT Score: "1250"
  - [ ] ACT Score: "28"
- [ ] Save
- [ ] **Verify**: Academic information stored
- [ ] **Verify**: Timeline adjusts based on new GPA/scores

**Notes**: ********\_********

#### Scenario 4: Add video links

- [ ] Edit athlete profile
- [ ] Click "Add Video Links"
- [ ] Add Hudl URL
- [ ] Add YouTube URLs (test up to 5)
- [ ] Save
- [ ] **Verify**: Video links stored
- [ ] **Verify**: Links appear on profile
- [ ] **Verify**: Links are clickable and functional

**Notes**: ********\_********

#### Scenario 5: Upload profile photo

- [ ] Edit athlete profile
- [ ] Click "Upload Photo"
- [ ] Select JPEG image under 5MB
- [ ] **Verify**: Image uploads successfully
- [ ] **Verify**: Photo displays on profile
- [ ] **Verify**: Photo appears compressed (smaller file size)
- [ ] Test with image over 5MB
- [ ] **Verify**: Error message, file rejected

**Notes**: ********\_********

#### Scenario 6: Field validation

- [ ] Try graduation year outside 9-12 range
- [ ] **Verify**: Error or constraint prevents invalid entry
- [ ] Try GPA outside 0.0-4.0
- [ ] **Verify**: Error prevents invalid entry
- [ ] Try SAT outside 400-1600
- [ ] **Verify**: Error prevents invalid entry
- [ ] Try ACT outside 1-36
- [ ] **Verify**: Error prevents invalid entry

**Notes**: ********\_********

#### Acceptance Criteria Checklist

- [ ] Profile creation completes in under 5 minutes
- [ ] Required fields clearly marked
- [ ] Academic info optional but highlighted
- [ ] Video links accept Hudl and YouTube URLs
- [ ] Photo upload limited to 5MB
- [ ] Photos auto-compressed
- [ ] Grade validation 9-12 enforced
- [ ] GPA validation 0.0-4.0 enforced
- [ ] Test score validation enforced

**Story 2.1 Status**: ☐ PASS ☐ FAIL | Date: **\_** | Tester: ****\_\_\_****

---

### Story 2.2: Parent and Athlete Update Profile

**As a parent or athlete, I want to update profile information as stats and academics change so the app always has current information.**

#### Scenario 1: Parent updates athlete profile

- [ ] Login as parent
- [ ] View athlete profile
- [ ] Click "Edit Profile"
- [ ] Update SAT score from 1250 to 1350
- [ ] Click "Save"
- [ ] **Verify**: SAT score updated to 1350
- [ ] **Verify**: Timeline recalculates based on new info
- [ ] **Verify**: Message "Profile updated"

**Notes**: ********\_********

#### Scenario 2: Athlete views profile read-only

- [ ] Login as athlete
- [ ] Navigate to "My Profile"
- [ ] **Verify**: Can see all athlete information
- [ ] **Verify**: Edit buttons hidden
- [ ] **Verify**: Message visible: "Ask your parent to edit" or similar
- [ ] Try to directly edit (e.g., via form manipulation)
- [ ] **Verify**: Backend prevents athlete from editing own profile

**Notes**: ********\_********

#### Scenario 3: Profile changes trigger fit score recalculation

- [ ] View schools and their fit scores (baseline)
- [ ] Edit athlete profile, change GPA from 2.8 to 3.2
- [ ] Save profile
- [ ] **Verify**: All school fit scores recalculate within 1 second
- [ ] **Verify**: Note which schools changed significantly
- [ ] **Verify**: Rule-based suggestions update based on new fit scores

**Notes**: ********\_********

#### Scenario 4: Parent views edit history

- [ ] View athlete profile
- [ ] Click "View History" (if available)
- [ ] **Verify**: Shows when profile was last updated
- [ ] **Verify**: Shows what was changed (field names)
- [ ] **Verify**: Shows before/after values
- [ ] **Verify**: Timestamps are accurate

**Notes**: ********\_********

#### Scenario 5: Secondary user cannot edit

- [ ] Login as secondary user
- [ ] Try to edit athlete profile
- [ ] **Verify**: Edit button disabled or hidden
- [ ] **Verify**: Cannot save any profile changes

**Notes**: ********\_********

#### Acceptance Criteria Checklist

- [ ] Profile edits save in under 2 seconds
- [ ] GPA/test score changes trigger recalculation
- [ ] Fit scores update within 1 second of change
- [ ] Secondary users cannot edit
- [ ] Edit history logged with timestamps
- [ ] Athlete cannot edit own profile

**Story 2.2 Status**: ☐ PASS ☐ FAIL | Date: **\_** | Tester: ****\_\_\_****

---

## EPIC 3: SCHOOL TRACKER (Stories 3.1 - 3.5)

### Story 3.1: Parent Adds Schools to Track List

**As a parent, I want to add schools my athlete is interested in so I can track them all in one place.**

#### Scenario 1: Add school from database

- [ ] Navigate to Schools page
- [ ] Click "Add School"
- [ ] Type "Arizona State"
- [ ] **Verify**: Database shows matching schools
- [ ] Click "Arizona State University"
- [ ] **Verify**: School selected
- [ ] Click "Add" or confirm
- [ ] **Verify**: ASU added to athlete's school list
- [ ] **Verify**: School information auto-populated (division, location, conference)
- [ ] Verify on school detail page:
  - [ ] Division: D1
  - [ ] Location: Tempe, AZ
  - [ ] Conference: PAC-12 (if applicable)

**Notes**: ********\_********

#### Scenario 2: Add school not in database

- [ ] Click "Add School"
- [ ] Search for non-existent school
- [ ] Click "Add Custom School"
- [ ] Fill in:
  - [ ] School Name: "Small State College"
  - [ ] State: "Colorado"
  - [ ] Division: "NAIA"
- [ ] Click "Add"
- [ ] **Verify**: Custom school added to list
- [ ] **Verify**: Appears with same formatting as database schools

**Notes**: ********\_********

#### Scenario 3: Prevent duplicates

- [ ] Try to add Arizona State again
- [ ] **Verify**: Warning "Arizona State is already on your list"
- [ ] **Verify**: School not duplicated
- [ ] Duplicate still shows in warning even if exact match check is case-insensitive

**Notes**: ********\_********

#### Scenario 4: School info auto-population

- [ ] Add 3 different schools from database
- [ ] For each, verify:
  - [ ] Division populated correctly
  - [ ] Location (city, state) correct
  - [ ] Conference populated (if D1)
  - [ ] Coach information available

**Notes**: ********\_********

#### Scenario 5: Add up to 50 schools

- [ ] Add multiple schools
- [ ] UI warns when approaching 30 schools (if applicable)
- [ ] Test adding schools up to maximum limit
- [ ] Try adding beyond maximum
- [ ] **Verify**: Error or warning when limit reached

**Notes**: ********\_********

#### Acceptance Criteria Checklist

- [ ] Adding school takes under 30 seconds
- [ ] School info auto-populates from database
- [ ] Can add up to 50 schools per athlete
- [ ] UI warns approaching 30 schools
- [ ] Cannot add duplicate schools
- [ ] Custom schools have all required fields

**Story 3.1 Status**: ☐ PASS ☐ FAIL | Date: **\_** | Tester: ****\_\_\_****

---

### Story 3.2: Parent Views School List with Fit Scores

**As a parent, I want to see a fit score for each school so I know where my athlete has the best realistic chance.**

#### Scenario 1: Fit scores display

- [ ] Add 5 schools to list
- [ ] Navigate to Schools page
- [ ] **Verify**: Each school shows fit score 0-100
- [ ] Example fit scores visible:
  - [ ] Arizona State: 82
  - [ ] Colorado: 68
  - [ ] Northern Colorado: 91
  - [ ] New Mexico: 75
  - [ ] Cal State Bakersfield: 78

**Notes**: ********\_********

#### Scenario 2: Fit score breakdown

- [ ] Click on school with fit score 82
- [ ] Click "View Fit Score Breakdown" or similar
- [ ] **Verify**: See 4 components:
  - [ ] Academic Fit: 85 (with reasoning, e.g., "GPA above program average")
  - [ ] Athletic Fit: 80 (with reasoning, e.g., "Stats solid for position")
  - [ ] Opportunity Fit: 78 (with reasoning, e.g., "Coach expressed interest")
  - [ ] Personal Fit: 82 (with reasoning, e.g., "Good school-life fit")

**Notes**: ********\_********

#### Scenario 3: Fit score updates with profile changes

- [ ] Note current fit score for a school (e.g., ASU = 68)
- [ ] Edit athlete profile, change GPA to 3.4
- [ ] Save profile
- [ ] Return to school list
- [ ] **Verify**: ASU fit score recalculates to ~82 within 1 second
- [ ] **Verify**: Notification "Fit scores updated"

**Notes**: ********\_********

#### Scenario 4: Honest assessment

- [ ] Athlete has below-average D1 stats
- [ ] View fit scores for D1 schools
- [ ] **Verify**: All D1 fit scores below 60
- [ ] **Verify**: App suggests D2/D3 schools as better fits
- [ ] No false hope; scores are realistic

**Notes**: ********\_********

#### Scenario 5: Algorithm transparency

- [ ] Look for algorithm explanation (help/info section)
- [ ] **Verify**: Algorithm documented and transparent
- [ ] Parents understand how score calculated

**Notes**: ********\_********

#### Acceptance Criteria Checklist

- [ ] Fit score displays 0-100 for all schools
- [ ] Updates within 1 second of profile change
- [ ] Breakdown shows 4 components
- [ ] Honest assessment (not false hope)
- [ ] Algorithm documented and transparent

**Story 3.2 Status**: ☐ PASS ☐ FAIL | Date: **\_** | Tester: ****\_\_\_****

---

### Story 3.3: Parent Filters and Sorts Schools

**As a parent, I want to filter schools by priority and status so I can focus on the most important ones.**

#### Scenario 1: Filter by priority tier

- [ ] Have 20 schools on list with mixed priorities
- [ ] Click Priority filter
- [ ] Select "Tier A (Top Choices)"
- [ ] **Verify**: Only Tier A schools display (~5 schools)
- [ ] **Verify**: Other tiers hidden
- [ ] Clear filter, try Tier B and Tier C
- [ ] **Verify**: Each filters correctly

**Notes**: ********\_********

#### Scenario 2: Filter by status

- [ ] Have schools in various statuses (Interested, Contacted, Recruited, etc.)
- [ ] Filter by Status = "Recruited"
- [ ] **Verify**: Only schools with coach interest display
- [ ] **Verify**: Schools only contacted (not recruited) hidden
- [ ] Try other statuses
- [ ] **Verify**: Each status filters correctly

**Notes**: ********\_********

#### Scenario 3: Filter by fit score range

- [ ] Click Fit Score filter
- [ ] Select "75-100"
- [ ] **Verify**: Only schools with fit scores in range display
- [ ] **Verify**: Schools below 75 hidden
- [ ] Try other ranges (60-75, 0-50, etc.)
- [ ] **Verify**: Each range filters correctly

**Notes**: ********\_********

#### Scenario 4: Sort by distance

- [ ] Set home location in profile settings
- [ ] Sort schools by "Distance from Home"
- [ ] **Verify**: Schools ordered closest to farthest
- [ ] **Verify**: Distance in miles displayed next to each
- [ ] Verify distances are accurate (can spot-check with map)

**Notes**: ********\_********

#### Scenario 5: Multiple filters combined

- [ ] Apply multiple filters:
  - [ ] Fit Score: 70+
  - [ ] Distance: <500 miles
  - [ ] Division: D2 or D3
- [ ] **Verify**: Schools matching ALL criteria display
- [ ] **Verify**: Results accurate (e.g., 8 schools match criteria)
- [ ] Change one filter, verify results update
- [ ] Clear all filters, verify full list returns

**Notes**: ********\_********

#### Scenario 6: Filter performance

- [ ] Apply complex filter (multiple fields)
- [ ] **Verify**: Results load in under 100ms
- [ ] No UI freezing or lag

**Notes**: ********\_********

#### Acceptance Criteria Checklist

- [ ] Filter by priority tier (A, B, C)
- [ ] Filter by status (Interested, Contacted, Recruited, etc.)
- [ ] Filter by fit score range
- [ ] Filter by distance (within X miles)
- [ ] Filter by division (D1, D2, D3, NAIA, JUCO)
- [ ] Filter by state
- [ ] Sort by distance, fit score, last contact date
- [ ] Multiple filters work together
- [ ] Filter results load under 100ms

**Story 3.3 Status**: ☐ PASS ☐ FAIL | Date: **\_** | Tester: ****\_\_\_****

---

### Story 3.4: Parent Sets School Priority and Status

**As a parent, I want to mark schools as priority tiers and track their status so I can focus on the most important schools.**

#### Scenario 1: Set priority tier

- [ ] View school in list
- [ ] Click on school detail
- [ ] Click "Priority Tier" or similar
- [ ] Select "A - Top Choice"
- [ ] Click "Save"
- [ ] **Verify**: School marked as Priority A
- [ ] **Verify**: Appears in "Top Choices" list/filter
- [ ] Change priority to B
- [ ] **Verify**: Updated correctly

**Notes**: ********\_********

#### Scenario 2: Track recruiting status

- [ ] View school detail page
- [ ] Click "Update Status" or similar
- [ ] Select from dropdown:
  - [ ] Interested
  - [ ] Contacted
  - [ ] Camp Invite
  - [ ] Recruited
  - [ ] Official Visit Invited
  - [ ] Official Visit Scheduled
  - [ ] Offer Received
  - [ ] Committed
  - [ ] Not Pursuing
- [ ] Select "Recruited"
- [ ] Click "Save"
- [ ] **Verify**: Status updated
- [ ] **Verify**: Other users see this status context (if applicable)

**Notes**: ********\_********

#### Scenario 3: Status change timestamped

- [ ] Update school status to "Offer Received"
- [ ] Save
- [ ] **Verify**: Status updates
- [ ] **Verify**: Date of status change recorded
- [ ] Click "View History" or similar
- [ ] **Verify**: See history of all status changes with dates

**Notes**: ********\_********

#### Scenario 4: Priority independent of status

- [ ] Set Priority A, Status = Interested
- [ ] Change Status to Recruited
- [ ] **Verify**: Priority A unchanged
- [ ] Change Priority to B
- [ ] **Verify**: Status still Recruited
- [ ] These are independent fields

**Notes**: ********\_********

#### Acceptance Criteria Checklist

- [ ] Can set priority tier independently of status
- [ ] Priority tiers: A (top choice), B (strong interest), C (fallback)
- [ ] Status values are predefined
- [ ] Status changes are timestamped
- [ ] Can view status history for each school
- [ ] Status changes visible in interaction timeline

**Story 3.4 Status**: ☐ PASS ☐ FAIL | Date: **\_** | Tester: ****\_\_\_****

---

### Story 3.5: Parent Views and Adds School Notes

**As a parent, I want to add and view notes about each school so I remember key details about why we're interested.**

#### Scenario 1: Add notes

- [ ] View school detail page (Arizona State)
- [ ] Click "Add Notes" or similar
- [ ] Type: "Great campus, strong athletic program, responsive coaches. Top choice."
- [ ] Click "Save"
- [ ] **Verify**: Notes saved
- [ ] **Verify**: Notes display on school detail page
- [ ] Refresh page
- [ ] **Verify**: Notes persist

**Notes**: ********\_********

#### Scenario 2: View coaching philosophy/info

- [ ] View school detail page
- [ ] View "Coaching Staff" section or similar
- [ ] **Verify**: Can see coaching-related information:
  - [ ] Coaching Style
  - [ ] Recruit Preferences
  - [ ] Communication Style
  - [ ] Success with similar athletes

**Notes**: ********\_********

#### Scenario 3: Edit notes

- [ ] Have existing notes for a school
- [ ] Click "Edit Notes"
- [ ] Add additional information
- [ ] Click "Save"
- [ ] **Verify**: Notes updated
- [ ] **Verify**: Updated date recorded
- [ ] **Verify**: New content visible on page

**Notes**: ********\_********

#### Scenario 4: Notes field constraints

- [ ] Try to add notes with 5,001+ characters
- [ ] **Verify**: Field accepts up to 5,000 characters
- [ ] **Verify**: Warning or truncation at limit
- [ ] Save notes with exactly 5,000 characters
- [ ] **Verify**: Saves successfully

**Notes**: ********\_********

#### Scenario 5: Notes save performance

- [ ] Add notes
- [ ] **Verify**: Save completes in under 2 seconds

**Notes**: ********\_********

#### Acceptance Criteria Checklist

- [ ] Notes field accepts up to 5,000 characters
- [ ] Notes save in under 2 seconds
- [ ] Notes display on school detail page
- [ ] Can edit notes any time
- [ ] Edit history recorded (shows when last updated)

**Story 3.5 Status**: ☐ PASS ☐ FAIL | Date: **\_** | Tester: ****\_\_\_****

---

## EPIC 4: COACHING STAFF (Stories 4.1 - 4.2)

### Story 4.1: Parent Views Coaching Staff Information

**As a parent, I want to see all the coaches at each school so I know who to contact and their communication preferences.**

#### Scenario 1: View coaches list

- [ ] Navigate to Arizona State detail page
- [ ] Click "Coaching Staff"
- [ ] **Verify**: See list with:
  - [ ] Coach Name
  - [ ] Role (Head Coach, Assistant Coach, Recruiting Coordinator)
  - [ ] Email
  - [ ] Phone number
- [ ] **Example**: Head Coach info visible with correct school affiliation

**Notes**: ********\_********

#### Scenario 2: Auto-populate from database

- [ ] Add a new school to list
- [ ] View school detail
- [ ] Click "Coaching Staff"
- [ ] **Verify**: Coach names and contact info auto-populated
- [ ] **Verify**: No manual entry required
- [ ] Verify data looks current and reasonable

**Notes**: ********\_********

#### Scenario 3: Manually add coach

- [ ] View school's coaching staff
- [ ] Click "Add Coach"
- [ ] Fill in:
  - [ ] Coach Name: "New Coach"
  - [ ] Role: "Assistant Coach"
  - [ ] Email: "newcoach@asu.edu"
  - [ ] Phone: "(480)555-0103"
- [ ] Click "Save"
- [ ] **Verify**: Coach added to list
- [ ] **Verify**: Can log interactions with this coach
- [ ] View interaction logging form
- [ ] **Verify**: New coach appears in dropdown

**Notes**: ********\_********

#### Scenario 4: View coach communication history

- [ ] Click on a coach's name
- [ ] **Verify**: Coach detail page opens with:
  - [ ] Last Contact: Date and time
  - [ ] Interaction Count: Total interactions
  - [ ] Communication History: Timeline of all interactions
  - [ ] Notes: Previous conversation notes
- [ ] Verify history matches interactions logged elsewhere

**Notes**: ********\_********

#### Scenario 5: Edit coach information

- [ ] Click on coach
- [ ] Click "Edit"
- [ ] Update coach email or phone
- [ ] Click "Save"
- [ ] **Verify**: Information updated
- [ ] **Verify**: Changes reflected in interactions going forward

**Notes**: ********\_********

#### Acceptance Criteria Checklist

- [ ] Coach information auto-populates from database
- [ ] Can manually add coaches not in database
- [ ] Coach detail shows all contact information
- [ ] Interaction history visible from coach page
- [ ] Can edit coach information if database is outdated

**Story 4.1 Status**: ☐ PASS ☐ FAIL | Date: **\_** | Tester: ****\_\_\_****

---

### Story 4.2: Parent Receives Follow-Up Reminders

**As a parent, I want to be reminded when it's been too long since contacting a coach so I don't let momentum die.**

#### Scenario 1: Reminder appears

- [ ] Log interaction with Coach A on Day 1
- [ ] Fast-forward time 21+ days (or wait in system)
- [ ] View dashboard or coach page
- [ ] **Verify**: Suggestion appears: "You haven't contacted [Coach A] at [School] for 21 days. Consider a follow-up email."
- [ ] **Verify**: Suggestion has high priority (orange/red color)

**Notes**: ********\_********

#### Scenario 2: Reminder is actionable

- [ ] See follow-up reminder
- [ ] Click on reminder
- [ ] **Verify**: Taken to coach contact form or interaction logging page
- [ ] **Verify**: Can log interaction or send follow-up email directly
- [ ] Log interaction
- [ ] **Verify**: Reminder disappears

**Notes**: ********\_********

#### Scenario 3: Reminder frequency not spammy

- [ ] See follow-up reminder
- [ ] Dismiss/close reminder
- [ ] Check app within 1 week
- [ ] **Verify**: Same reminder does NOT reappear
- [ ] Wait 1+ week, same coach still not contacted
- [ ] **Verify**: Reminder reappears

**Notes**: ********\_********

#### Scenario 4: Respect NCAA dead periods

- [ ] System is set to dead period (if configurable)
- [ ] Evaluate follow-up reminders
- [ ] **Verify**: Reminders do NOT suggest contacting coaches during dead periods
- [ ] **Verify**: Note visible: "Dead period - no recruiting contact permitted"

**Notes**: ********\_********

#### Scenario 5: Reminder severity

- [ ] Contact Coach A on Day 1
- [ ] Fast-forward 21 days
- [ ] **Verify**: Reminder yellow/medium severity
- [ ] Fast-forward to 30+ days
- [ ] **Verify**: Reminder turns red/high severity

**Notes**: ********\_********

#### Acceptance Criteria Checklist

- [ ] Reminder triggers after 21+ days of no contact
- [ ] Reminder is actionable (links to contact form)
- [ ] Same reminder shows max once per week
- [ ] Respects NCAA recruiting windows (no reminders during dead periods)
- [ ] Reminder severity matches recency (21 days = yellow, 30 days = red)

**Story 4.2 Status**: ☐ PASS ☐ FAIL | Date: **\_** | Tester: ****\_\_\_****

---

## EPIC 5: INTERACTIONS (Stories 5.1 - 5.3)

### Story 5.1: Parent Logs Interactions with Coaches

**As a parent, I want to log every interaction with coaches so I have a complete record of what's been discussed.**

#### Scenario 1: Log email interaction

- [ ] View school or coach page
- [ ] Click "Log Interaction"
- [ ] Fill in:
  - [ ] Type: "Email"
  - [ ] Date: Today's date
  - [ ] School: "Arizona State"
  - [ ] Coach: "[Head Coach name]"
  - [ ] Direction: "Outbound (we initiated)"
  - [ ] Notes: "Sent highlight video and expressed interest"
- [ ] Click "Save"
- [ ] **Verify**: Interaction logged
- [ ] **Verify**: Appears in timeline
- [ ] **Verify**: Timestamp recorded

**Notes**: ********\_********

#### Scenario 2: Log phone call

- [ ] Click "Log Interaction"
- [ ] Select Type = "Phone Call"
- [ ] Enter date of call (today)
- [ ] Enter coach name
- [ ] Enter call direction (Inbound/Outbound)
- [ ] Enter notes about call
- [ ] Click "Save"
- [ ] **Verify**: Call logged
- [ ] **Verify**: "Last Contact" date updates to today

**Notes**: ********\_********

#### Scenario 3: Log camp attendance

- [ ] Click "Log Interaction"
- [ ] Fill in:
  - [ ] Type: "Camp"
  - [ ] Date: [Date of camp]
  - [ ] School: "Arizona State"
  - [ ] Notes: "Great coaching, athlete got attention"
- [ ] Click "Save"
- [ ] **Verify**: Camp visit logged
- [ ] **Verify**: Counts toward "contact frequency" calculations

**Notes**: ********\_********

#### Scenario 4: Set follow-up reminder during logging

- [ ] Log an interaction
- [ ] Check "Set Follow-up Reminder"
- [ ] Select follow-up date (e.g., 2 weeks from now)
- [ ] Save interaction
- [ ] **Verify**: Interaction logged
- [ ] **Verify**: Reminder created for follow-up date
- [ ] Check reminders/calendar
- [ ] **Verify**: Reminder appears on scheduled date

**Notes**: ********\_********

#### Scenario 5: Quick logging after event

- [ ] After viewing a showcase/event
- [ ] **Verify**: App shows post-event prompt: "Did you have any interactions? Log them now"
- [ ] Click "Yes, log an interaction"
- [ ] **Verify**: Quick logging form appears (simplified)
- [ ] Fill in and save interaction in under 30 seconds
- [ ] **Verify**: Interaction logged with minimal steps

**Notes**: ********\_********

#### Scenario 6: Interaction type variety

- [ ] Log interactions of different types:
  - [ ] Email
  - [ ] Phone Call
  - [ ] Text/DM
  - [ ] In-Person Meeting
  - [ ] Camp
  - [ ] Showcase
  - [ ] Game
  - [ ] Unofficial Visit
  - [ ] Official Visit
  - [ ] Other
- [ ] **Verify**: All types available and save correctly

**Notes**: ********\_********

#### Scenario 7: File attachments

- [ ] Log interaction
- [ ] Click "Attach File"
- [ ] Attach PDF or image (under 10MB)
- [ ] **Verify**: File attached to interaction
- [ ] **Verify**: Can view/download attached file from timeline
- [ ] Try attaching file over 10MB
- [ ] **Verify**: Error or rejection

**Notes**: ********\_********

#### Scenario 8: Last contact auto-calculation

- [ ] Log interaction with Coach A
- [ ] Check coach's "Last Contact" field
- [ ] **Verify**: Auto-calculated from most recent interaction
- [ ] Log newer interaction with Coach A
- [ ] **Verify**: Last Contact date updated
- [ ] View school-level last contact
- [ ] **Verify**: Shows most recent interaction with any coach at school

**Notes**: ********\_********

#### Acceptance Criteria Checklist

- [ ] Interaction logged in under 1 minute
- [ ] All 10 interaction types available
- [ ] Can attach files up to 10MB
- [ ] Date selector intuitive
- [ ] Notes field accepts 0-5,000 characters
- [ ] Follow-up reminder optional
- [ ] Interactions timestamped
- [ ] Last contact auto-calculates

**Story 5.1 Status**: ☐ PASS ☐ FAIL | Date: **\_** | Tester: ****\_\_\_****

---

### Story 5.2: Parent Views Interaction Timeline

**As a parent, I want to see a timeline of all interactions with a school or coach so I can see how often we're in contact and what was discussed.**

#### Scenario 1: School-specific timeline

- [ ] Click on Arizona State
- [ ] Click "Interaction History"
- [ ] **Verify**: See all interactions with ASU in chronological order
- [ ] Example timeline:
  - [ ] Jan 10 | Email | Outbound | Sent highlight video
  - [ ] Jan 5 | Camp | Inbound/Outbound | Attended camp, coach took video
  - [ ] Dec 20 | Email | Inbound | Coach expressed interest
- [ ] Verify newest at top or bottom (consistent ordering)

**Notes**: ********\_********

#### Scenario 2: Coach-specific timeline

- [ ] Click on coach name (e.g., Head Coach at ASU)
- [ ] **Verify**: See all interactions with this specific coach
- [ ] Example:
  - [ ] Jan 10 | Email | Sent highlight video
  - [ ] Dec 20 | Email | Coach replied with interest
- [ ] Verify only interactions with selected coach shown

**Notes**: ********\_********

#### Scenario 3: Timeline summary metrics

- [ ] View interaction timeline
- [ ] **Verify**: See summary showing:
  - [ ] Total interactions with school: 8
  - [ ] Last contact: 5 days ago
  - [ ] Contact frequency: 1.5 emails/month
  - [ ] Outbound vs Inbound: 3 outbound, 5 inbound

**Notes**: ********\_********

#### Scenario 4: Timeline filters by type

- [ ] View interaction timeline
- [ ] Click filter "Email only"
- [ ] **Verify**: Only email interactions display
- [ ] **Verify**: Camps, calls, etc. hidden
- [ ] Try other filters (Calls only, Camps only, etc.)
- [ ] **Verify**: Each filter works correctly

**Notes**: ********\_********

#### Scenario 5: Timeline filters by date range

- [ ] Click filter "Date Range"
- [ ] Select date range (e.g., last 30 days)
- [ ] **Verify**: Only interactions in range display
- [ ] Try other ranges
- [ ] **Verify**: Filters work correctly

**Notes**: ********\_********

#### Scenario 6: Interaction notes visible

- [ ] View timeline
- [ ] **Verify**: Interaction notes visible in timeline
- [ ] Click on interaction
- [ ] **Verify**: Full notes and details viewable
- [ ] Click away
- [ ] **Verify**: Timeline still intact

**Notes**: ********\_********

#### Scenario 7: Timeline performance

- [ ] View school with many interactions (10+)
- [ ] **Verify**: Timeline loads in under 1 second
- [ ] Apply filters
- [ ] **Verify**: Filter results load quickly
- [ ] No UI lag or freezing

**Notes**: ********\_********

#### Acceptance Criteria Checklist

- [ ] Timeline displays all interactions chronologically
- [ ] Timeline shows both school-level and coach-level views
- [ ] Can filter by interaction type
- [ ] Can filter by date range
- [ ] Interaction notes visible in timeline
- [ ] Timeline loads under 1 second

**Story 5.2 Status**: ☐ PASS ☐ FAIL | Date: **\_** | Tester: ****\_\_\_****

---

### Story 5.3: Athlete Logs Own Interactions

**As an athlete, I want to log my own calls and emails with coaches so my parent knows what I'm doing.**

#### Scenario 1: Athlete logs email

- [ ] Login as athlete
- [ ] Click "Log Interaction"
- [ ] Fill in:
  - [ ] Type: "Email"
  - [ ] Coach: "[Coach name]"
  - [ ] Date: Today
  - [ ] What I said: "Asked about campus visit dates"
- [ ] Click "Save"
- [ ] **Verify**: Interaction logged
- [ ] **Verify**: Parent can see it in timeline

**Notes**: ********\_********

#### Scenario 2: Athlete logs phone call received

- [ ] Athlete click "Log Interaction"
- [ ] Fill in:
  - [ ] Type: "Phone Call"
  - [ ] Coach: "[Coach name]"
  - [ ] Direction: "Inbound (they called)"
  - [ ] Notes: "Coach wants me to visit in spring"
- [ ] Save
- [ ] **Verify**: Call logged
- [ ] **Verify**: Parent sees interaction
- [ ] **Verify**: Parent can follow up if needed

**Notes**: ********\_********

#### Scenario 3: Athlete views interaction history

- [ ] Login as athlete
- [ ] Click "My Interactions"
- [ ] **Verify**: See all interactions athlete logged
- [ ] **Verify**: Can see total contact frequency
- [ ] View coach detail from athlete account
- [ ] **Verify**: Athlete can see communication history

**Notes**: ********\_********

#### Scenario 4: Athlete logging speed

- [ ] Log interaction as athlete
- [ ] **Verify**: Completes in under 1 minute
- [ ] Form is simplified vs. parent's version (less fields)

**Notes**: ********\_********

#### Scenario 5: Parent sees athlete-logged interactions

- [ ] Athlete logs interaction
- [ ] Parent logs in to same account
- [ ] View interaction timeline
- [ ] **Verify**: Athlete's interaction visible
- [ ] **Verify**: Marked as logged by athlete (if distinguishable)
- [ ] View coaching staff communication history
- [ ] **Verify**: Athlete interaction appears

**Notes**: ********\_********

#### Acceptance Criteria Checklist

- [ ] Athlete can log all interaction types
- [ ] Athlete's interactions visible to parent
- [ ] Athlete sees full interaction history
- [ ] Athlete interaction logging under 1 minute

**Story 5.3 Status**: ☐ PASS ☐ FAIL | Date: **\_** | Tester: ****\_\_\_****

---

## EPIC 6: RECRUITING TIMELINE (Stories 6.1 - 6.2)

### Story 6.1: Parent Views Recruiting Stage Guidance

**As a parent, I want to see what stage my athlete is in so I know what to focus on right now and what not to worry about yet.**

#### Scenario 1: Timeline for freshman

- [ ] Create/view profile with graduation year 2027 (freshman)
- [ ] Navigate to "Timeline" or "Recruiting Guide"
- [ ] **Verify**: See:
  - [ ] Current Stage: "Foundation Stage (Freshman)"
  - [ ] Visual timeline showing 4-year progression with freshman highlighted
  - [ ] Stage description: "You're in the Foundation Stage. Right now, it's all about development, not recruitment..."

**Notes**: ********\_********

#### Scenario 2: Stage-appropriate guidance

- [ ] View freshman timeline
- [ ] **Verify**: See sections:
  - [ ] What Matters Now: Improve athletic skill, maintain GPA, build relationships with coaches
  - [ ] Expected Activities: 3-5 bullet points (camps, highlight videos, academic focus, etc.)
  - [ ] Common Worries: "Is it too early?", "Shouldn't we be getting recruited?" etc.
  - [ ] What NOT to stress: "Don't worry about college offers yet..." etc.
- [ ] Tone is reassuring and conversational, not corporate

**Notes**: ********\_********

#### Scenario 3: Timeline adjusts by grade

- [ ] Create profile with graduation year 2025 (junior)
- [ ] View timeline
- [ ] **Verify**: See "Junior Stage" content (not freshman)
- [ ] **Verify**: Guidance specific to juniors
- [ ] Create profile with graduation year 2026 (sophomore)
- [ ] View timeline
- [ ] **Verify**: See "Sophomore Stage" content

**Notes**: ********\_********

#### Scenario 4: Upcoming milestones

- [ ] View timeline
- [ ] Scroll to "Upcoming Milestones"
- [ ] **Verify**: See relevant dates:
  - [ ] Next SAT test date: March 14, 2026
  - [ ] NCAA registration deadline: (appropriate date)
  - [ ] Early decision deadline: November 1, 2026
  - [ ] Other relevant dates based on athlete's profile

**Notes**: ********\_********

#### Scenario 5: Timeline loading and responsiveness

- [ ] View timeline on desktop
- [ ] **Verify**: Loads in under 1 second
- [ ] **Verify**: Mobile responsive
- [ ] View on phone
- [ ] **Verify**: Content readable, no excessive scrolling
- [ ] All sections accessible on mobile

**Notes**: ********\_********

#### Acceptance Criteria Checklist

- [ ] Stage auto-detected based on grad year
- [ ] Stage guidance specific and reassuring
- [ ] Upcoming milestones update based on current date and grad year
- [ ] "What not to stress" section visible and prominent
- [ ] Timeline is conversational (not corporate jargon)
- [ ] Mobile responsive
- [ ] Loads in under 1 second

**Story 6.1 Status**: ☐ PASS ☐ FAIL | Date: **\_** | Tester: ****\_\_\_****

---

### Story 6.2: Parent Sees Current Status Indicator

**As a parent, I want to see if my athlete is "on track" for their stage so I can course-correct if needed.**

#### Scenario 1: Status "On Track"

- [ ] Athlete: 9 of 12 tasks completed, 8 schools contacted, good GPA (3.4)
- [ ] View timeline
- [ ] **Verify**: See:
  - [ ] Overall Status: "On Track" (green)
  - [ ] Task Progress: 9/12 tasks completed (75%)
  - [ ] School Tracking: 8 schools tracked
  - [ ] GPA Status: Solid (3.4 unweighted)

**Notes**: ********\_********

#### Scenario 2: Status "Slightly Behind"

- [ ] Athlete: 4 of 12 tasks completed, only 2 schools contacted
- [ ] View timeline
- [ ] **Verify**: See:
  - [ ] Overall Status: "Slightly Behind" (yellow)
  - [ ] Task Progress: 4/12 tasks completed (33%)
  - [ ] School Tracking: 2 schools tracked
  - [ ] Next Steps: "Consider adding more schools and logging interactions"
- [ ] Color is yellow/orange warning

**Notes**: ********\_********

#### Scenario 3: Status "At Risk"

- [ ] Athlete: Junior, not registered with NCAA, no highlight video, GPA below program standards
- [ ] View timeline
- [ ] **Verify**: See:
  - [ ] Overall Status: "At Risk" (red)
  - [ ] Urgent Tasks: 3 critical tasks not started
  - [ ] Action Items: Specific recommendations to get back on track
- [ ] Color is red/high alert

**Notes**: ********\_********

#### Scenario 4: Status recalculation

- [ ] View status as "Slightly Behind"
- [ ] Complete several tasks
- [ ] Refresh page or view status again
- [ ] **Verify**: Status updates to "On Track" or improved status
- [ ] Status is dynamically calculated, not static

**Notes**: ********\_********

#### Scenario 5: Status for different grades

- [ ] Freshman athlete slightly behind on fundamentals
- [ ] **Verify**: "At Risk" doesn't appear (less critical than junior)
- [ ] Junior athlete "Slightly Behind" on school list
- [ ] **Verify**: "At Risk" may show (more critical for junior)
- [ ] Grade-appropriate urgency levels

**Notes**: ********\_********

#### Acceptance Criteria Checklist

- [ ] Status accurately reflects task completion
- [ ] Status color-coded (green, yellow, red)
- [ ] Status updates based on profile changes
- [ ] Clear action items for "Behind" and "At Risk" statuses

**Story 6.2 Status**: ☐ PASS ☐ FAIL | Date: **\_** | Tester: ****\_\_\_****

---

## EPIC 7: SUGGESTIONS (Stories 7.1 - 7.3)

### Story 7.1: Parent Receives Actionable Suggestions

**As a parent, I want to receive suggestions about what to do next so I don't have to figure out the recruiting process on my own.**

#### Scenario 1: Top 3 suggestions on dashboard

- [ ] Login
- [ ] View dashboard
- [ ] **Verify**: "Suggestions" section with top 3 items
- [ ] Example suggestions:
  - [ ] "Upload highlight video" | High priority | Click to learn how
  - [ ] "You haven't contacted [School] in 3 weeks" | Medium priority | Click to log interaction
  - [ ] "Register with NCAA eligibility center" | High priority | Click for info

**Notes**: ********\_********

#### Scenario 2: Stage-appropriate suggestions

- [ ] Athlete is sophomore
- [ ] View suggestions
- [ ] **Verify**: See suggestions like:
  - [ ] "Build your school list to 20-30 targets"
  - [ ] "Attend summer showcases"
- [ ] **Verify**: NOT see suggestions like "Schedule official visits" (junior year activity)

**Notes**: ********\_********

#### Scenario 3: Different suggestions for juniors

- [ ] Athlete is junior
- [ ] View suggestions
- [ ] **Verify**: See suggestions like:
  - [ ] "Register with NCAA eligibility center"
  - [ ] "Begin formal outreach to coaches"
  - [ ] "Complete professional highlight video"
- [ ] Different from sophomore suggestions

**Notes**: ********\_********

#### Scenario 4: Suggestion links to action

- [ ] See suggestion "Upload highlight video"
- [ ] Click on it
- [ ] **Verify**: Taken to page explaining:
  - [ ] Why highlight videos matter
  - [ ] How to upload to Hudl
  - [ ] Acceptance criteria for videos
- [ ] Can complete action from linked page

**Notes**: ********\_********

#### Scenario 5: Suggestion sorting

- [ ] View suggestions
- [ ] **Verify**: Sorted by urgency/relevance
- [ ] Most important/urgent at top
- [ ] Less important lower
- [ ] Sorting makes sense for athlete's situation

**Notes**: ********\_********

#### Scenario 6: Mobile friendly

- [ ] View suggestions on phone
- [ ] **Verify**: Mobile friendly layout
- [ ] Suggestions readable and actionable on small screen
- [ ] Action buttons easy to tap

**Notes**: ********\_********

#### Acceptance Criteria Checklist

- [ ] Top 3 suggestions visible on dashboard
- [ ] Suggestions relevant to athlete's stage and current data
- [ ] Suggestions are actionable (not vague)
- [ ] Each suggestion has a primary action button
- [ ] Suggestions sorted by urgency/relevance
- [ ] Mobile friendly

**Story 7.1 Status**: ☐ PASS ☐ FAIL | Date: **\_** | Tester: ****\_\_\_****

---

### Story 7.2: Parent Can Dismiss and Complete Suggestions

**As a parent, I want to dismiss suggestions I don't need and mark them complete so my suggestion list stays relevant.**

#### Scenario 1: Dismiss suggestion

- [ ] See suggestion "Attend more showcases"
- [ ] Click "Dismiss"
- [ ] **Verify**: Suggestion hidden
- [ ] **Verify**: Won't reappear unless condition changes
- [ ] Refresh page
- [ ] **Verify**: Still hidden

**Notes**: ********\_********

#### Scenario 2: Mark suggestion complete

- [ ] See suggestion "Upload highlight video"
- [ ] Click "Mark as Done"
- [ ] **Verify**: Suggestion marked complete
- [ ] **Verify**: Disappears from active suggestions
- [ ] **Verify**: New suggestion appears in its place

**Notes**: ********\_********

#### Scenario 3: Dismissed suggestion reappears if condition changes

- [ ] Dismiss "Contact [Coach A]" suggestion
- [ ] Note the date
- [ ] Wait 21+ days without contacting Coach A
- [ ] **Verify**: Suggestion reappears (because "no contact 21 days" rule triggered again)

**Notes**: ********\_********

#### Scenario 4: Suggestion frequency respects time limits

- [ ] Dismiss suggestion
- [ ] Check app within 1 week
- [ ] **Verify**: Same suggestion does NOT reappear
- [ ] **Verify**: Different suggestions shown instead

**Notes**: ********\_********

#### Scenario 5: Completed suggestions never reappear

- [ ] Mark suggestion as "Done"
- [ ] Wait weeks/months
- [ ] **Verify**: Suggestion never reappears
- [ ] Can view completed suggestions in history (if available)

**Notes**: ********\_********

#### Scenario 6: Multiple suggestion management

- [ ] Have 10+ suggestions in queue
- [ ] Dismiss 3, complete 2
- [ ] **Verify**: Correct suggestions removed
- [ ] **Verify**: List updates with new suggestions
- [ ] Refresh page
- [ ] **Verify**: State persists correctly

**Notes**: ********\_********

#### Acceptance Criteria Checklist

- [ ] Can dismiss any suggestion
- [ ] Can mark suggestion as completed
- [ ] Same suggestion shown max once per week
- [ ] Dismissing does not delete the suggestion
- [ ] Suggestions reappear if conditions change
- [ ] Completed suggestions never reappear

**Story 7.2 Status**: ☐ PASS ☐ FAIL | Date: **\_** | Tester: ****\_\_\_****

---

### Story 7.3: Suggestions Update Based on New Data

**As a parent, I want to have suggestions automatically update so I always get relevant guidance.**

#### Scenario 1: Suggestions update after profile change

- [ ] Arizona State shows fit score 68
- [ ] Update athlete GPA to 3.4
- [ ] Save profile
- [ ] **Verify**: Within 1 second, suggestions update
- [ ] Old suggestion "Focus on D2/D3 schools" may change to "ASU is now in your realistic range"
- [ ] Dashboard refreshes and shows new suggestions

**Notes**: ********\_********

#### Scenario 2: Suggestions update after interaction logging

- [ ] See suggestion "You haven't contacted Coach A in 21 days"
- [ ] Log interaction with Coach A
- [ ] Save interaction
- [ ] **Verify**: Suggestion marked complete
- [ ] **Verify**: Disappears from active list
- [ ] New suggestion appears in its place

**Notes**: ********\_********

#### Scenario 3: Daily suggestion refresh

- [ ] No profile or interaction changes made
- [ ] Wait for daily update to run (or manually trigger if available)
- [ ] **Verify**: Suggestions refresh
- [ ] **Verify**: New relevant suggestions may appear based on passing time
- [ ] Example: "X days until SAT test"

**Notes**: ********\_********

#### Scenario 4: Real-time notification of changes

- [ ] Update profile
- [ ] **Verify**: Notification appears "Suggestions updated"
- [ ] View updated suggestions
- [ ] Changes are recent and relevant

**Notes**: ********\_********

#### Acceptance Criteria Checklist

- [ ] Suggestions update within 1 second of profile/interaction changes
- [ ] Daily suggestion refresh occurs
- [ ] Users see notification when suggestions change

**Story 7.3 Status**: ☐ PASS ☐ FAIL | Date: **\_** | Tester: ****\_\_\_****

---

## EPIC 8: DASHBOARD (Stories 8.1 - 8.3)

### Story 8.1: Parent Views Dashboard Overview

**As a parent, I want to see the current state at a glance so I don't have to dig around to see what matters now.**

#### Scenario 1: Complete dashboard view

- [ ] Login
- [ ] Land on dashboard
- [ ] **Verify**: Sections visible:
  - [ ] Quick Stats: 15 schools tracked, 8 A-tier, 12 contacts this month
  - [ ] Top Suggestions: 3 actionable items with priority
  - [ ] Recruiting Timeline: Current stage and progress
  - [ ] Contact Frequency: Schools contacted in last 7 days
  - [ ] Recent Activity: Latest interactions (emails, calls, camps)
  - [ ] Quick Actions: Add school, Log interaction, Review timeline

**Notes**: ********\_********

#### Scenario 2: Dashboard mobile responsive

- [ ] View dashboard on phone
- [ ] **Verify**: All sections visible
- [ ] **Verify**: Content readable without excessive scrolling
- [ ] **Verify**: Buttons easy to tap
- [ ] Try on different screen sizes
- [ ] **Verify**: Responsive to all sizes

**Notes**: ********\_********

#### Scenario 3: Dashboard loading performance

- [ ] Click Dashboard link
- [ ] **Verify**: Page loads in under 2 seconds
- [ ] **Verify**: All data visible immediately
- [ ] No spinners/loaders after initial load

**Notes**: ********\_********

#### Scenario 4: Quick action buttons

- [ ] View dashboard
- [ ] **Verify**: Quick action buttons prominent and visible
- [ ] Click "Add School"
- [ ] **Verify**: Takes to school add page
- [ ] Back to dashboard
- [ ] Click "Log Interaction"
- [ ] **Verify**: Takes to interaction form
- [ ] Back to dashboard
- [ ] Click "Review Timeline"
- [ ] **Verify**: Takes to recruiting timeline

**Notes**: ********\_********

#### Scenario 5: Dashboard no console errors

- [ ] Open dashboard
- [ ] Open browser console (Dev Tools)
- [ ] **Verify**: No JavaScript errors
- [ ] **Verify**: No warnings that affect functionality

**Notes**: ********\_********

#### Acceptance Criteria Checklist

- [ ] Dashboard shows quick stats, suggestions, timeline, activity
- [ ] Dashboard loads in under 2 seconds
- [ ] Mobile responsive design
- [ ] All sections visible without excessive scrolling
- [ ] Quick action buttons prominent
- [ ] No console errors

**Story 8.1 Status**: ☐ PASS ☐ FAIL | Date: **\_** | Tester: ****\_\_\_****

---

### Story 8.2: Parent Sees Contact Frequency Summary

**As a parent, I want to see contact frequency with schools so I know which schools need more attention.**

#### Scenario 1: Contact frequency summary

- [ ] View dashboard
- [ ] **Verify**: "Contact Frequency" section with:
  - [ ] Total schools tracked: 15
  - [ ] Schools contacted in last 7 days: 8
  - [ ] Average contact frequency: 1.2 contacts per school per month
  - [ ] Schools with no recent contact: 2 (links to follow-up)

**Notes**: ********\_********

#### Scenario 2: Color-coded by frequency

- [ ] View contact frequency section
- [ ] **Verify**: Schools color-coded:
  - [ ] Green: Regular contact (weekly+)
  - [ ] Yellow: Some contact (monthly)
  - [ ] Red: No recent contact (30+ days)
- [ ] Verify color coding is consistent with actual contact dates

**Notes**: ********\_********

#### Scenario 3: Click school needing attention

- [ ] See school: "No contact for 45 days" (red)
- [ ] Click on school
- [ ] **Verify**: Taken to school detail page
- [ ] **Verify**: Options visible to log interaction or send email
- [ ] Click "Log Interaction"
- [ ] **Verify**: Form opens pre-filled with school/coaches

**Notes**: ********\_********

#### Scenario 4: Real-time contact frequency updates

- [ ] View contact frequency
- [ ] Note a school showing "No contact for 20 days"
- [ ] Log interaction with that school
- [ ] Return to dashboard
- [ ] **Verify**: Contact frequency updates in real-time
- [ ] School now shows recent contact

**Notes**: ********\_********

#### Acceptance Criteria Checklist

- [ ] Contact frequency accurately calculated
- [ ] Color-coded by recency (green, yellow, red)
- [ ] Links to follow-up actions
- [ ] Updates in real-time

**Story 8.2 Status**: ☐ PASS ☐ FAIL | Date: **\_** | Tester: ****\_\_\_****

---

### Story 8.3: Parent Views Recent Activity Feed

**As a parent, I want to see recent interactions and changes so I stay updated on what's happening.**

#### Scenario 1: Activity feed displays

- [ ] View dashboard
- [ ] Scroll to "Recent Activity" section
- [ ] **Verify**: See feed of recent events:
  - [ ] Logged interaction: Email to ASU | Jan 10
  - [ ] Profile updated: SAT score 1350 | Jan 8
  - [ ] Added school: Northern Colorado | Jan 7
  - [ ] Logged interaction: Camp at CU | Jan 5

**Notes**: ********\_********

#### Scenario 2: Activity feed shows interactions

- [ ] Log an interaction
- [ ] Return to dashboard
- [ ] **Verify**: Interaction appears in activity feed
- [ ] **Verify**: Shows:
  - [ ] Type: Email, Call, Camp, etc.
  - [ ] School: Name of school
  - [ ] Date: When it occurred
  - [ ] Summary: First 50 characters of notes

**Notes**: ********\_********

#### Scenario 3: Activity feed shows profile updates

- [ ] Update athlete profile (change SAT score)
- [ ] Return to dashboard
- [ ] **Verify**: Profile update appears in feed
- [ ] **Verify**: Shows:
  - [ ] Field changed: "SAT Score"
  - [ ] Old value: 1200
  - [ ] New value: 1350
  - [ ] Date: When changed

**Notes**: ********\_********

#### Scenario 4: Activity feed shows latest events

- [ ] **Verify**: Activity feed shows last 10 events
- [ ] Make many changes (log interactions, update profile, add schools)
- [ ] **Verify**: Feed updates with latest events
- [ ] Oldest events pushed off the bottom

**Notes**: ********\_********

#### Scenario 5: Click event for details

- [ ] View activity feed
- [ ] Click on an event
- [ ] **Verify**: Can view full details of event
- [ ] Click away or back
- [ ] **Verify**: Feed still intact, not disrupted

**Notes**: ********\_********

#### Scenario 6: Activity feed timestamps

- [ ] View activity feed
- [ ] **Verify**: All events timestamped accurately
- [ ] Recent events show time (e.g., "2 hours ago")
- [ ] Older events show date (e.g., "Jan 5")

**Notes**: ********\_********

#### Acceptance Criteria Checklist

- [ ] Activity feed shows last 10 events
- [ ] Events timestamped accurately
- [ ] Feed updates in real-time
- [ ] Can click event to view details

**Story 8.3 Status**: ☐ PASS ☐ FAIL | Date: **\_** | Tester: ****\_\_\_****

---

## EPIC 9: ATHLETE TASKS (Stories 9.1 - 9.3)

### Story 9.1: Athlete Views Their Task List

**As an athlete, I want to see what I should be doing right now so I can plan my efforts and feel progress.**

#### Scenario 1: View tasks for current grade

- [ ] Login as sophomore athlete
- [ ] Click "My Tasks"
- [ ] **Verify**: See tasks for sophomore year:
  - [ ] Upload highlight video | Not Started | -
  - [ ] Create school list (30-50 schools) | In Progress | -
  - [ ] Register with NCSA | Not Started | -
  - [ ] Attend summer showcases | Not Started | June 30
  - [ ] Research SAT/ACT schedule | Completed | -
- [ ] Verify tasks are appropriate for sophomore

**Notes**: ********\_********

#### Scenario 2: See progress

- [ ] View task list
- [ ] **Verify**: See "You've completed 4 of 20 tasks (20%)"
- [ ] **Verify**: Progress bar shows 20% completion

**Notes**: ********\_********

#### Scenario 3: Mark task complete

- [ ] See task "Upload highlight video" | Not Started
- [ ] Click checkbox to mark complete
- [ ] **Verify**: Task marked as complete (visual change)
- [ ] **Verify**: See "Great job!" message
- [ ] **Verify**: Progress counter increases (5/20)
- [ ] Refresh page
- [ ] **Verify**: Task completion persists

**Notes**: ********\_********

#### Scenario 4: View task details

- [ ] Click on "Create school list"
- [ ] **Verify**: Task detail page opens with:
  - [ ] Task Name: "Create school list (30-50 schools)"
  - [ ] Why It Matters: "Schools need to know about you; you need options in winter"
  - [ ] What to Do: "Start with 50, narrow to 20-30 by end of year"
  - [ ] Resources: Links to college search database, tips
  - [ ] Deadline: "End of school year"
- [ ] Click resource links
- [ ] **Verify**: Links work and open helpful information

**Notes**: ********\_********

#### Scenario 5: Task completion flow

- [ ] Log in as athlete with 4/20 tasks complete
- [ ] Complete 3 more tasks
- [ ] **Verify**: Progress updates to 7/20 (35%)
- [ ] Progress bar visually updates
- [ ] Motivational message or celebration (if implemented)

**Notes**: ********\_********

#### Scenario 6: Mobile view

- [ ] View task list on phone
- [ ] **Verify**: Clean, easy-to-navigate layout
- [ ] **Verify**: Checkboxes large and easy to tap
- [ ] **Verify**: Task details readable on small screen

**Notes**: ********\_********

#### Acceptance Criteria Checklist

- [ ] Tasks filtered correctly by grade
- [ ] Can mark task complete with checkbox
- [ ] Progress counter accurate
- [ ] Tasks cannot be deleted, only marked complete/incomplete
- [ ] Task details are clear and helpful
- [ ] Mobile view is clean and easy to navigate

**Story 9.1 Status**: ☐ PASS ☐ FAIL | Date: **\_** | Tester: ****\_\_\_****

---

### Story 9.2: Parent Sees Athlete's Task Progress

**As a parent, I want to see what tasks my athlete should focus on so I can support and encourage them.**

#### Scenario 1: Parent views athlete's tasks

- [ ] Login as parent
- [ ] Click "John's Tasks" or navigate to athlete's tasks
- [ ] **Verify**: See all of John's tasks for current grade
- [ ] **Verify**: See progress "9/20 tasks completed"
- [ ] **Verify**: Can see which tasks are overdue or urgent

**Notes**: ********\_********

#### Scenario 2: Filter by not-started

- [ ] Click filter "Not Started"
- [ ] **Verify**: See only tasks John hasn't begun
- [ ] **Verify**: Grouped by priority
- [ ] See which tasks need immediate attention

**Notes**: ********\_********

#### Scenario 3: See task deadlines with color coding

- [ ] View task list
- [ ] **Verify**: See color-coded deadlines:
  - [ ] Red: Due today
  - [ ] Orange: Due within 7 days
  - [ ] Yellow: Due in 2+ weeks
- [ ] Deadline colors align with urgency

**Notes**: ********\_********

#### Scenario 4: Parent cannot edit athlete's tasks

- [ ] View athlete's task list
- [ ] Try to mark a task complete
- [ ] **Verify**: Cannot mark athlete's task as complete
- [ ] **Verify**: Edit/check button disabled or hidden
- [ ] Athlete owns their progress, not parent

**Notes**: ********\_********

#### Scenario 5: Parent sees task details

- [ ] Click on a task
- [ ] **Verify**: See full task details (What to Do, Why It Matters, Resources)
- [ ] **Verify**: Can use this to support and encourage athlete
- [ ] Share resources with athlete if helpful

**Notes**: ********\_********

#### Scenario 6: Task completion visibility

- [ ] Athlete completes a task
- [ ] Parent views same athlete's tasks
- [ ] **Verify**: Completion immediately visible
- [ ] **Verify**: Progress counter updates

**Notes**: ********\_********

#### Acceptance Criteria Checklist

- [ ] Parent can view athlete's tasks
- [ ] Parent sees completion progress
- [ ] Parent cannot edit athlete's tasks (athlete owns their progress)
- [ ] Parent sees deadlines and urgency
- [ ] Parent can see task details to provide support

**Story 9.2 Status**: ☐ PASS ☐ FAIL | Date: **\_** | Tester: ****\_\_\_****

---

### Story 9.3: Tasks Unlock Based on Completion

**As a system, I want to unlock dependent tasks only when prerequisites are complete so the athlete focuses on the right order.**

#### Scenario 1: Task locks until prerequisite complete

- [ ] Athlete views task list
- [ ] Task A: "Register with NCSA"
- [ ] Task B: "Update NCSA profile with latest stats"
- [ ] **Verify**: Task B is locked/hidden
- [ ] **Verify**: See message "You'll unlock this task once you complete 'Register with NCSA'"

**Notes**: ********\_********

#### Scenario 2: Locked task unlocks automatically

- [ ] Athlete completes Task A "Register with NCSA"
- [ ] Task saves as complete
- [ ] **Verify**: Task B "Update NCSA profile" automatically unlocks
- [ ] **Verify**: Task B appears in task list
- [ ] **Verify**: Unlock happens within 1 second
- [ ] Athlete sees new task immediately

**Notes**: ********\_********

#### Scenario 3: Task list respects logical order

- [ ] View sophomore tasks in dependency order:
  - [ ] 1. Upload highlight video (unlock others)
  - [ ] 2. Create school list (start research)
  - [ ] 3. Contact coaches (once list created)
- [ ] **Verify**: Tasks organized in dependency order
- [ ] **Verify**: Cannot skip ahead (later tasks locked)
- [ ] Complete in order
- [ ] **Verify**: Each unlock enables next

**Notes**: ********\_********

#### Scenario 4: Task dependency database

- [ ] View task with prerequisite
- [ ] Verify in database (admin panel if available):
  - [ ] Task has `prerequisite_task_id` field
  - [ ] Dependencies configured correctly

**Notes**: ********\_********

#### Scenario 5: Multiple dependencies

- [ ] Some tasks may have multiple prerequisites
- [ ] Task locked until ALL prerequisites complete
- [ ] Complete first prerequisite
- [ ] **Verify**: Task still locked
- [ ] Complete second prerequisite
- [ ] **Verify**: Task now unlocks

**Notes**: ********\_********

#### Acceptance Criteria Checklist

- [ ] Task dependencies defined in database
- [ ] Locked tasks don't appear until prerequisites complete
- [ ] Unlocked tasks appear automatically
- [ ] Unlocking is immediate (within 1 second)
- [ ] Athlete understands why task is locked

**Story 9.3 Status**: ☐ PASS ☐ FAIL | Date: **\_** | Tester: ****\_\_\_****

---

## EPIC 10: RECRUITING PACKET (Stories 10.1 - 10.2)

### Story 10.1: Athlete Generates Recruiting Packet

**As an athlete, I want to generate a recruiting packet so I can send my info to coaches.**

#### Scenario 1: Generate PDF

- [ ] View dashboard
- [ ] Click "Generate Recruiting Packet"
- [ ] **Verify**: PDF created in under 5 seconds
- [ ] **Verify**: Filename: "John_Smith_RecruitingPacket.pdf"
- [ ] **Verify**: File downloads or is ready to view

**Notes**: ********\_********

#### Scenario 2: PDF includes athlete profile

- [ ] Open generated PDF
- [ ] **Verify**: Includes:
  - [ ] Photo: Athlete profile photo (if uploaded)
  - [ ] Name & Position: John Smith, Pitcher
  - [ ] Contact Info: Email, phone, high school
  - [ ] Stats: Height, weight, jersey number
  - [ ] Academics: GPA, test scores, core courses
  - [ ] Video Links: Hudl, YouTube links
  - [ ] Social Media: Instagram, Twitter handles
- [ ] Verify all data is current and accurate

**Notes**: ********\_********

#### Scenario 3: PDF includes school list

- [ ] View "Schools" section of PDF
- [ ] **Verify**: All tracked schools organized by priority
- [ ] Example table:
  - [ ] School | Priority | Status | Fit Score
  - [ ] Arizona State | A | Recruited | 82
  - [ ] Colorado | A | Contacted | 75
  - [ ] Northern Colorado | B | Interested | 91
- [ ] Verify schools are accurate and complete

**Notes**: ********\_********

#### Scenario 4: PDF includes interaction summary

- [ ] View "Activity" section
- [ ] **Verify**: Includes:
  - [ ] Total schools tracked: 15
  - [ ] Total interactions: 23
  - [ ] Most recent contact: 5 days ago
  - [ ] Email interactions: 8
  - [ ] Camp visits: 3
  - [ ] Coach calls: 2
- [ ] Verify numbers are accurate

**Notes**: ********\_********

#### Scenario 5: PDF professional and readable

- [ ] Open PDF
- [ ] **Verify**:
  - [ ] Professional fonts and layout
  - [ ] 5-15 pages depending on data size
  - [ ] Date generated visible
  - [ ] Readable on phone and desktop
  - [ ] File size under 10MB
- [ ] Print PDF
- [ ] **Verify**: Prints clearly and professionally

**Notes**: ********\_********

#### Scenario 6: PDF data accuracy

- [ ] Update athlete profile
- [ ] Generate new PDF
- [ ] **Verify**: PDF includes latest data
- [ ] Change GPA, log interaction, add school
- [ ] Generate PDF again
- [ ] **Verify**: All changes reflected

**Notes**: ********\_********

#### Acceptance Criteria Checklist

- [ ] PDF generates in under 5 seconds
- [ ] PDF is readable and professional
- [ ] All athlete info accurate and up-to-date
- [ ] School list complete and organized
- [ ] Interaction summary included
- [ ] PDF file size under 10MB
- [ ] Includes date generated

**Story 10.1 Status**: ☐ PASS ☐ FAIL | Date: **\_** | Tester: ****\_\_\_****

---

### Story 10.2: Parent Downloads or Emails Recruiting Packet

**As a parent, I want to download or email the recruiting packet so I can archive it or share with coaches.**

#### Scenario 1: Download PDF

- [ ] Generate recruiting packet
- [ ] Click "Download PDF"
- [ ] **Verify**: PDF downloads to computer
- [ ] **Verify**: Filename: "John_Smith_RecruitingPacket.pdf"
- [ ] Open downloaded file
- [ ] **Verify**: Content intact and readable

**Notes**: ********\_********

#### Scenario 2: Email PDF to coach

- [ ] Click "Email to Coach"
- [ ] **Verify**: Email form appears with:
  - [ ] To: [Coach email from school list]
  - [ ] Subject: "John Smith - Recruiting Profile"
  - [ ] Body: [Default intro message]
- [ ] **Verify**: Can customize email before sending
- [ ] Customize message
- [ ] Click "Send"
- [ ] **Verify**: Email sent successfully

**Notes**: ********\_********

#### Scenario 3: Email to multiple coaches

- [ ] Click "Email to Multiple Coaches"
- [ ] Select coaches from list (e.g., 3 coaches)
- [ ] **Verify**: Form prepares emails to each
- [ ] Customize email (if desired)
- [ ] Click "Send All"
- [ ] **Verify**: Emails sent to all selected coaches
- [ ] Verify each received (check email or system logs)

**Notes**: ********\_********

#### Scenario 4: PDF reflects current data

- [ ] Update athlete profile
- [ ] Email PDF to coach
- [ ] **Verify**: PDF includes updated data
- [ ] Coach receives current information

**Notes**: ********\_********

#### Scenario 5: Professional email template

- [ ] Email PDF to coach
- [ ] **Verify**: Email has professional template
- [ ] Signature included (if applicable)
- [ ] Formatting clean and readable
- [ ] Coach receives professional impression

**Notes**: ********\_********

#### Scenario 6: Customize email

- [ ] Click "Email to Coach"
- [ ] **Verify**: Can edit subject line
- [ ] **Verify**: Can edit body text
- [ ] **Verify**: Can add personalization (name, etc.)
- [ ] Send customized email
- [ ] **Verify**: Coach receives customized message

**Notes**: ********\_********

#### Acceptance Criteria Checklist

- [ ] Can download PDF as attachment
- [ ] Can email PDF directly to coaches
- [ ] Can send to multiple coaches
- [ ] PDF always reflects current data
- [ ] Email has professional template
- [ ] Can customize email before sending

**Story 10.2 Status**: ☐ PASS ☐ FAIL | Date: **\_** | Tester: ****\_\_\_****

---

## Testing Completion Summary

| Epic | Story | Status | Date   | Tester       |
| ---- | ----- | ------ | ------ | ------------ |
| 1    | 1.1   | ☐      | **\_** | ****\_\_**** |
| 1    | 1.2   | ☐      | **\_** | ****\_\_**** |
| 1    | 1.3   | ☐      | **\_** | ****\_\_**** |
| 1    | 1.4   | ☐      | **\_** | ****\_\_**** |
| 2    | 2.1   | ☐      | **\_** | ****\_\_**** |
| 2    | 2.2   | ☐      | **\_** | ****\_\_**** |
| 3    | 3.1   | ☐      | **\_** | ****\_\_**** |
| 3    | 3.2   | ☐      | **\_** | ****\_\_**** |
| 3    | 3.3   | ☐      | **\_** | ****\_\_**** |
| 3    | 3.4   | ☐      | **\_** | ****\_\_**** |
| 3    | 3.5   | ☐      | **\_** | ****\_\_**** |
| 4    | 4.1   | ☐      | **\_** | ****\_\_**** |
| 4    | 4.2   | ☐      | **\_** | ****\_\_**** |
| 5    | 5.1   | ☐      | **\_** | ****\_\_**** |
| 5    | 5.2   | ☐      | **\_** | ****\_\_**** |
| 5    | 5.3   | ☐      | **\_** | ****\_\_**** |
| 6    | 6.1   | ☐      | **\_** | ****\_\_**** |
| 6    | 6.2   | ☐      | **\_** | ****\_\_**** |
| 7    | 7.1   | ☐      | **\_** | ****\_\_**** |
| 7    | 7.2   | ☐      | **\_** | ****\_\_**** |
| 7    | 7.3   | ☐      | **\_** | ****\_\_**** |
| 8    | 8.1   | ☐      | **\_** | ****\_\_**** |
| 8    | 8.2   | ☐      | **\_** | ****\_\_**** |
| 8    | 8.3   | ☐      | **\_** | ****\_\_**** |
| 9    | 9.1   | ☐      | **\_** | ****\_\_**** |
| 9    | 9.2   | ☐      | **\_** | ****\_\_**** |
| 9    | 9.3   | ☐      | **\_** | ****\_\_**** |
| 10   | 10.1  | ☐      | **\_** | ****\_\_**** |
| 10   | 10.2  | ☐      | **\_** | ****\_\_**** |

---

## Notes for Testers

### Tips for Effective Manual Testing

1. **Use realistic data**: Create test athlete profiles with realistic names, grades, and stats
2. **Test edge cases**: Try boundary conditions (e.g., exactly 8 characters for password, 5MB photos)
3. **Test on multiple devices**: Desktop, tablet, phone to catch responsive design issues
4. **Check timestamps**: Verify dates are recorded correctly and match system time
5. **Verify data persistence**: Refresh pages to ensure data saves correctly
6. **Test error scenarios**: Try invalid inputs, network failures, etc.
7. **Check cross-user interactions**: If applicable, test as parent and athlete/secondary user

### Common Issues to Watch For

- [ ] Typos in error messages
- [ ] Missing or incorrect icons/badges
- [ ] Slow load times (performance)
- [ ] Unresponsive buttons or forms
- [ ] Data not persisting across page refreshes
- [ ] Mobile layout issues
- [ ] Missing or incomplete data auto-population
- [ ] Color-coding inconsistencies
- [ ] Broken links or navigation

### Questions for Developers (if issues found)

- Is this a known limitation?
- What's the expected behavior?
- Should this be a new bug ticket?
- Is there a workaround?

---

**Document Version**: 1.0
**Last Updated**: January 2026
**Platform**: Web (applicable to iOS with behavioral focus)
