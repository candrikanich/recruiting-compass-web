# Document Form Refactoring

## Summary

Refactored the document upload form to follow the established pattern used in other add forms (e.g., interactions).

## Pattern Applied

Following the **interactions/add.vue** pattern:

1. ✅ Dedicated `/documents/add` page route
2. ✅ Uses `FormPageLayout` wrapper with back button, title, description
3. ✅ Separate `DocumentForm` component
4. ✅ handleSubmit in page calls composable
5. ✅ handleCancel navigates back to list

## Changes Made

### 1. Created `components/Document/DocumentForm.vue`
- Reusable form component following SchoolForm.vue pattern
- Uses DesignSystem components (FormInput, FormSelect, FormTextarea)
- Props: `loading` (boolean)
- Emits: `submit` (with formData), `cancel`
- Features:
  - Document type selection
  - Title and description fields
  - Optional school association
  - Version field
  - File upload with validation
  - Allowed file types based on document type
  - Form validation

### 2. Created `pages/documents/add.vue`
- Dedicated add page following interactions/add.vue pattern
- Uses `FormPageLayout` with "blue" header color
- Integrates `DocumentForm` component
- Handles form submission via `uploadDocument` composable
- Handles cancellation via navigateTo('/documents')
- Displays upload errors

### 3. Updated `pages/documents/index.vue`
- **Removed**: Inline form (120+ lines)
- **Removed**: `showUploadForm` toggle state
- **Removed**: Form-related reactive data (`newDoc`)
- **Removed**: File upload state (`selectedFile`, `selectedFileName`, `fileInput`)
- **Removed**: `handleUpload` and `handleFileSelect` functions
- **Removed**: `allowedFileTypes` computed property
- **Changed**: "+ Add Document" button now navigates to `/documents/add`
- **Simplified**: Cleaner, focused on list view only

## Benefits

1. **Consistency**: Matches the pattern used by interactions and other forms
2. **Separation of Concerns**: Form logic separate from list logic
3. **Maintainability**: Easier to update form without affecting list
4. **Reusability**: DocumentForm can be reused elsewhere if needed
5. **Cleaner Code**: Removed 120+ lines from index page
6. **Better UX**: Dedicated page for focused form experience

## Files Modified

- ✅ `components/Document/DocumentForm.vue` (NEW)
- ✅ `pages/documents/add.vue` (NEW)
- ✅ `pages/documents/index.vue` (SIMPLIFIED)

## Notes

- `DocumentUploadModal.vue` remains unchanged - used for school-specific document uploads
- Form validation uses existing `useFormValidation` composable
- File type validation enforces allowed formats per document type
- Version field defaults to "1" as a string (compatible with DesignSystemFormInput)

## Verification

- ✅ TypeScript type-check passes
- ⏳ Unit tests running
- 🔲 Manual browser testing needed

## Next Steps

1. Manual browser test of `/documents/add` page
2. Test form submission flow
3. Verify navigation back to `/documents`
4. Test error handling and file validation
