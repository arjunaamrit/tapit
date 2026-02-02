
## Plan: Clean Up Landing Page

### Summary
Remove sample document functionality, testimonials/reviews section, stats section (fake metrics), and fix copyright year to be dynamic (matching the Footer component pattern).

---

### Changes Overview

#### 1. Remove Sample Document

**Files affected:**
- `src/pages/DocumentReader.tsx` - Remove import, function, and button
- `src/data/sampleDocument.ts` - Delete file entirely

**Specific changes in DocumentReader.tsx:**
- Remove line 43: `import { SAMPLE_DOCUMENT } from "@/data/sampleDocument";`
- Remove lines 248-259: `handleLoadSampleDocument` function
- Remove lines 561-569: "Try Sample Document" button in hero section

#### 2. Remove Stats Section (Fake Metrics)

**File affected:** `src/pages/DocumentReader.tsx`

The stats show fabricated numbers like "50K+ Active Readers" and "2M+ Documents Processed" which could be misleading for a new app.

**Specific changes:**
- Remove lines 419-424: `stats` array definition
- Remove lines 679-696: Stats section JSX

#### 3. Remove Testimonials/Reviews Section

**File affected:** `src/pages/DocumentReader.tsx`

The testimonials show fictional people with fake quotes which is not authentic.

**Specific changes:**
- Remove lines 395-417: `testimonials` array definition
- Remove lines 698-735: Testimonials section JSX
- Remove lines 20-21: Unused imports (`Star`, `Quote`)
- Remove line 22: Unused import (`Users`)
- Line 24: `Globe` import may still be needed - will verify

#### 4. Fix Copyright Year

**Files affected:**
- `src/pages/DocumentReader.tsx` - Line 778
- `src/pages/Terms.tsx` - Line 141
- `src/pages/Privacy.tsx` - Line 187

**Change:** Replace hardcoded "2025" with `{new Date().getFullYear()}` to match the Footer.tsx pattern. This ensures the year stays current automatically.

#### 5. Update CTA Section Text

**File affected:** `src/pages/DocumentReader.tsx`

Line 744 says "Join over 50,000 learners..." - This reference to fake user count should be updated to something more honest like "Start your reading journey with ReadMate."

---

### Technical Details

**Imports to remove from DocumentReader.tsx:**
```typescript
// Remove these from the import block
Star,
Quote,
Users,
FileCheck,  // Only used in stats
Globe,      // Only used in stats
```

**SAMPLE_DOCUMENT import removal:**
```typescript
// Delete this line
import { SAMPLE_DOCUMENT } from "@/data/sampleDocument";
```

**File to delete:**
- `src/data/sampleDocument.ts`

---

### After Implementation

The landing page will:
- Still have the hero section with upload button
- Show the 4 feature cards
- Have the upload section
- Have the CTA section (with updated, honest text)
- Have the footer with Terms/Privacy links and dynamic year
- No longer show fake statistics or testimonials
- No longer have the "Try Sample Document" button
