# Backend Student ID Generation - Specification & Fix

## 🚨 Current Issue

**Problem**: Student ID generation is using incorrect logic, resulting in wrong initials.

**Example**:
- Input: `"Francis Akujuobi"`
- Expected: `"TT-FA-00046"` (F from Francis + A from Akujuobi)
- Current (WRONG): `"TT-AK-00046"` (A + K from Akujuobi - first 2 letters of last name)

**Root Cause**: Backend is likely extracting initials from the wrong name parts or using incorrect logic.

---

## ✅ Correct Implementation

### ID Format

```markdown:BACKEND_STUDENT_ID_GENERATION_SPECIFICATION.md
```
TT-{INITIALS}-{SEQUENCE}
```

Where:
- `TT` = Fixed prefix
- `{INITIALS}` = 2 uppercase letters (first letter of first name + first letter of second name)
- `{SEQUENCE}` = 5-digit zero-padded number (00001, 00002, etc.)

### Examples

| Full Name | Expected ID | Logic |
|-----------|------------|-------|
| "Francis Akujuobi" | `TT-FA-00046` | F (Francis) + A (Akujuobi) |
| "John Doe" | `TT-JD-00001` | J (John) + D (Doe) |
| "Mary Jane Watson" | `TT-MJ-00001` | M (Mary) + J (Jane) - **First 2 names only** |
| "Madonna" | `TT-MA-00001` | M + A (first 2 letters of single name) |
| "" (empty) | `TT-XX-00001` | Fallback to XX |

---

## 📋 Generation Logic

### Algorithm

```typescript
function generateStudentId(fullName: string): string {
  // Step 1: Normalize input
  const trimmedName = fullName?.trim() || "";
  
  // Step 2: Handle empty/missing name
  if (!trimmedName) {
    return generateIdWithInitials("XX");
  }
  
  // Step 3: Split name into parts (handles multiple spaces)
  const nameParts = trimmedName.split(/\s+/).filter(part => part.length > 0);
  
  // Step 4: Extract initials
  let initials = "";
  
  if (nameParts.length >= 2) {
    // ✅ CORRECT: First letter of FIRST name + First letter of SECOND name
    const firstInitial = nameParts[0][0]?.toUpperCase() || "";
    const secondInitial = nameParts[1][0]?.toUpperCase() || "";
    initials = firstInitial + secondInitial;
  } else if (nameParts.length === 1) {
    // Single name: Take first 2 letters
    const name = nameParts[0];
    const firstChar = name[0]?.toUpperCase() || "";
    const secondChar = name[1]?.toUpperCase() || "X";
    initials = firstChar + secondChar;
  }
  
  // Step 5: Ensure we have exactly 2 characters
  if (initials.length < 2) {
    initials = initials.padEnd(2, "X");
  }
  
  // Step 6: Get next sequence number for these initials
  const sequence = getNextSequenceForInitials(initials);
  
  // Step 7: Format and return
  return `TT-${initials}-${String(sequence).padStart(5, "0")}`;
}

function getNextSequenceForInitials(initials: string): number {
  // Query database for highest sequence number with these initials
  // Example SQL:
  // SELECT MAX(CAST(SUBSTRING(studentId, -5) AS UNSIGNED)) 
  // FROM students 
  // WHERE studentId LIKE 'TT-{initials}-%'
  
  // Return next number (currentMax + 1, or 1 if none exists)
}
```

---

## 🔍 Key Rules

### 1. Name Parsing
- Split by whitespace (`/\s+/`)
- Filter out empty parts
- Case-insensitive (convert to uppercase)

### 2. Initials Extraction
- **2+ names**: Use first letter of **first name** + first letter of **second name**
- **1 name**: Use first 2 letters of that name
- **Empty**: Use "XX" as fallback

### 3. Sequence Numbering
- **Per initials combination**: Each initials combo has its own sequence
  - `TT-FA-00001`, `TT-FA-00002`, `TT-FA-00003`...
  - `TT-JD-00001`, `TT-JD-00002`...
- **Independent sequences**: FA sequence is independent of JD sequence
- **Database query**: Must query existing records to get next number

### 4. Edge Cases

| Input | Handling |
|-------|----------|
| `"  John  Doe  "` | Trim and normalize → `"John Doe"` → `TT-JD-00001` |
| `"John"` | Single name → `TT-JO-00001` |
| `"A"` | Single char → `TT-AX-00001` (pad with X) |
| `""` | Empty → `TT-XX-00001` |
| `"John   Middle   Doe"` | Use first 2 names → `TT-JM-00001` (not JD) |
| `"O'Brien"` | Special chars → `TT-OB-00001` (use first 2 chars) |

---

## 🗄️ Database Implementation

### Query for Next Sequence

**SQL Example (MySQL/PostgreSQL)**:
```sql
-- Get next sequence number for given initials
SELECT COALESCE(MAX(CAST(SUBSTRING(studentId, -5) AS UNSIGNED)), 0) + 1 AS nextSequence
FROM students
WHERE studentId LIKE CONCAT('TT-', ?, '-%')
  AND studentId REGEXP '^TT-[A-Z]{2}-[0-9]{5}$';
```

**Prisma Example**:
```typescript
async function getNextSequenceForInitials(initials: string): Promise<number> {
  const pattern = `TT-${initials}-%`;
  
  const result = await prisma.student.findMany({
    where: {
      studentId: {
        startsWith: `TT-${initials}-`,
      },
    },
    select: {
      studentId: true,
    },
  });
  
  // Extract sequence numbers and find max
  const sequences = result
    .map(s => {
      const match = s.studentId?.match(/TT-[A-Z]{2}-(\d{5})$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(n => !isNaN(n));
  
  const maxSequence = sequences.length > 0 ? Math.max(...sequences) : 0;
  return maxSequence + 1;
}
```

### Transaction Safety

**CRITICAL**: Use database transactions to prevent race conditions:

```typescript
async function createStudentWithId(data: CreateStudent): Promise<Student> {
  return await prisma.$transaction(async (tx) => {
    // 1. Generate initials
    const initials = extractInitials(data.fullName);
    
    // 2. Get next sequence (within transaction)
    const sequence = await getNextSequenceForInitials(initials, tx);
    
    // 3. Generate ID
    const studentId = `TT-${initials}-${String(sequence).padStart(5, "0")}`;
    
    // 4. Create student (within same transaction)
    return await tx.student.create({
      data: {
        ...data,
        studentId,
      },
    });
  });
}
```

---

## 🔒 Security Considerations

### 1. Backend-Only Generation
- ✅ **DO**: Generate student ID on backend only
- ❌ **DON'T**: Accept studentId from frontend (security risk)
- ❌ **DON'T**: Trust client-generated IDs

### 2. Validation
- Validate format: `^TT-[A-Z]{2}-[0-9]{5}$`
- Ensure uniqueness before assignment
- Handle race conditions with transactions

### 3. Input Sanitization
- Trim whitespace
- Handle special characters
- Normalize case

---

## 🧪 Test Cases

### Test Suite

```typescript
describe("Student ID Generation", () => {
  test("Two names: Francis Akujuobi → TT-FA-00001", () => {
    expect(generateStudentId("Francis Akujuobi")).toMatch(/^TT-FA-\d{5}$/);
    expect(generateStudentId("Francis Akujuobi")).toBe("TT-FA-00001"); // First one
  });
  
  test("Two names: John Doe → TT-JD-00001", () => {
    expect(generateStudentId("John Doe")).toBe("TT-JD-00001");
  });
  
  test("Three names: Mary Jane Watson → TT-MJ-00001", () => {
    // Should use first 2 names only
    expect(generateStudentId("Mary Jane Watson")).toBe("TT-MJ-00001");
  });
  
  test("Single name: Madonna → TT-MA-00001", () => {
    expect(generateStudentId("Madonna")).toBe("TT-MA-00001");
  });
  
  test("Empty name → TT-XX-00001", () => {
    expect(generateStudentId("")).toBe("TT-XX-00001");
    expect(generateStudentId("   ")).toBe("TT-XX-00001");
  });
  
  test("Whitespace normalization", () => {
    expect(generateStudentId("  John  Doe  ")).toBe("TT-JD-00001");
  });
  
  test("Case insensitivity", () => {
    expect(generateStudentId("john doe")).toBe("TT-JD-00001");
    expect(generateStudentId("JOHN DOE")).toBe("TT-JD-00001");
  });
  
  test("Sequential numbering per initials", async () => {
    // Create first student
    const student1 = await createStudent({ fullName: "Francis Akujuobi" });
    expect(student1.studentId).toBe("TT-FA-00001");
    
    // Create second student with same initials
    const student2 = await createStudent({ fullName: "Frank Adams" });
    expect(student2.studentId).toBe("TT-FA-00002");
    
    // Create student with different initials
    const student3 = await createStudent({ fullName: "John Doe" });
    expect(student3.studentId).toBe("TT-JD-00001"); // Independent sequence
  });
});
```

---

## 📝 Implementation Checklist

### Backend Tasks

- [ ] **Fix initials extraction logic**
  - [ ] Use first letter of first name + first letter of second name
  - [ ] Handle single names (first 2 letters)
  - [ ] Handle empty names (XX fallback)

- [ ] **Implement sequence numbering**
  - [ ] Query database for max sequence per initials
  - [ ] Use transactions to prevent race conditions
  - [ ] Handle concurrent requests safely

- [ ] **Add validation**
  - [ ] Validate ID format before saving
  - [ ] Ensure uniqueness
  - [ ] Handle edge cases

- [ ] **Update existing code**
  - [ ] Find where student ID is currently generated
  - [ ] Replace with correct logic
  - [ ] Test thoroughly

- [ ] **Database considerations**
  - [ ] Add index on `studentId` if not exists
  - [ ] Consider unique constraint (if IDs must be globally unique)
  - [ ] Optimize sequence query performance

---

## 🔄 Migration Notes

### Existing Students

**Question**: What about existing students with incorrect IDs?

**Options**:
1. **Leave as-is**: Only fix for new students
2. **Regenerate**: Update existing student IDs (risky - may break references)
3. **Hybrid**: Keep existing, fix only new ones

**Recommendation**: Option 1 (leave existing, fix new) unless there's a critical business need to regenerate.

---

## 📚 Reference: Archive Implementation

The Archive feature uses the **same logic** on the frontend. For consistency, backend student ID generation should match:

**Archive Logic** (from `ArchiveCreate.modal.tsx`):
```typescript
if (nameParts.length >= 2) {
  // Take first letter of first name and first letter of second name
  initials = (nameParts[0][0] || "").toUpperCase() + (nameParts[1][0] || "").toUpperCase();
}
```

**This is the correct logic to implement on the backend.**

---

## ❓ Questions for Backend Team

1. **Current Implementation**: Where is student ID currently generated? (file/function name)
2. **Database**: What database are you using? (MySQL, PostgreSQL, etc.)
3. **ORM**: What ORM/framework? (Prisma, TypeORM, Sequelize, etc.)
4. **Existing Data**: Should we regenerate existing student IDs or only fix new ones?
5. **Uniqueness**: Should student IDs be globally unique or per-center?

---

## 📞 Contact

For questions or clarifications, please refer to:
- Frontend Archive Implementation: `src/components/modals/academic/ArchiveCreate.modal.tsx`
- This specification document

---

**Last Updated**: [Current Date]
**Status**: 🔴 **URGENT** - Production Bug Fix Required
```

This document includes:
- Current issue explanation
- Correct algorithm with code examples
- Database implementation guidance
- Security considerations
- Test cases
- Implementation checklist
- Migration notes

Should I save this as `BACKEND_STUDENT_ID_GENERATION_SPECIFICATION.md` in the project root?
