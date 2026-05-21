# Course Database Schema

## Tables

### courses
Course catalog.

| Column        | Type           | Description                                              |
|---------------|----------------|----------------------------------------------------------|
| `course_id`   | VARCHAR(20) PK | Course identifier                                        |
| `name`        | VARCHAR(255)   | Full course name                                         |
| `credits`     | DECIMAL(3,1)   | Credit hours                                             |
| `module_type` | CHAR(1)        | Cross-module category: `'I'`, `'II'`, `'III'`, or `NULL` |
| `is_new`      | BOOLEAN        | Whether this is a newly offered course                   |

---

### modules
Professional cross modules (1–14), the top-level container.

| Column        | Type         | Description          |
|---------------|--------------|----------------------|
| `module_id`   | INT PK       | Module number (1–14) |
| `name`        | VARCHAR(100) | Module name          |
| `description` | TEXT         | Optional description |

---

### course_groups
Sub-groups within a module, or standalone groups (e.g. Math Basis, PE, Foreign Language).

| Column       | Type                      | Description                                                            |
|--------------|---------------------------|------------------------------------------------------------------------|
| `group_id`   | SERIAL PK                 | Auto-increment ID                                                      |
| `module_id`  | INT → `modules.module_id` | Parent module (`NULL` for standalone groups)                           |
| `group_code` | VARCHAR(20)               | Short code, unique within module (e.g. `'1A'`, `'1B'`, `'MATH_BASIS'`) |
| `name`       | VARCHAR(100)              | Human-readable name                                                    |

---

### group_courses
Assigns a course to a group.

| Column      | Type                              | Description                                            |
|-------------|-----------------------------------|--------------------------------------------------------|
| `group_id`  | INT → `course_groups.group_id`    | Target group                                           |
| `course_id` | VARCHAR(20) → `courses.course_id` | Course in the group                                    |
| `note`      | VARCHAR(255)                      | Informational annotation (e.g. `"Ⅱ类"`, `"航空航天工程专业必修"`) |

---

### choice_sets
General "N‑choose‑M" constraint **within a single group**.

| Column       | Type                           | Description                                                                      |
|--------------|--------------------------------|----------------------------------------------------------------------------------|
| `set_id`     | SERIAL PK                      | Auto-increment ID                                                                |
| `group_id`   | INT → `course_groups.group_id` | Group this set belongs to (`NULL` if standalone, e.g. for OR‑prerequisite pools) |
| `name`       | VARCHAR(100)                   | Set name, unique per group                                                       |
| `min_select` | INT                            | Minimum courses to pick (default 1)                                              |
| `max_select` | INT                            | Maximum courses to pick (default 1)                                              |

**Example**: Probability 3‑choose‑1 → `min_select=1, max_select=1`.

---

### choice_set_courses
Courses belonging to a choice set.

| Column      | Type                              | Description      |
|-------------|-----------------------------------|------------------|
| `set_id`    | INT → `choice_sets.set_id`        | Choice set       |
| `course_id` | VARCHAR(20) → `courses.course_id` | Available option |

---

### course_prerequisites
**AND** prerequisite: course A requires course B (and all such entries must be satisfied).

| Column             | Type                              | Description                        |
|--------------------|-----------------------------------|------------------------------------|
| `course_id`        | VARCHAR(20) → `courses.course_id` | The course that has a prerequisite |
| `prereq_course_id` | VARCHAR(20) → `courses.course_id` | The required prior course          |

**Example**: `C103 → C101` means Aerodynamics requires Fluid Mechanics.

---

### course_prereq_choice_sets
**OR** prerequisite: course A requires N‑of‑M from a `choice_sets` pool.

| Column              | Type                              | Description                                            |
|---------------------|-----------------------------------|--------------------------------------------------------|
| `course_id`         | VARCHAR(20) → `courses.course_id` | The course that has an OR‑prerequisite                 |
| `prereq_choice_set` | INT → `choice_sets.set_id`        | A choice set whose courses are the alternative options |

The actual `min_select` / `max_select` constraint lives on `choice_sets` itself.

**Example**: Modules 1–3 require at least one of {Solid Mechanics, Mechanics of Materials, Mechanics of Materials (Eng)} → `choice_sets(min_select=1)`, then each target course links to that set via this table.

---

### degree_tracks
Degree program definitions.

| Column                   | Type           | Description                    |
|--------------------------|----------------|--------------------------------|
| `track_code`             | VARCHAR(20) PK | e.g. `'AE'`, `'SE'`, `'IE'`    |
| `name`                   | VARCHAR(100)   | Full name                      |
| `total_credits_required` | DECIMAL(4,1)   | Reference total (default 24.0) |
| `description`            | TEXT           | Optional description           |

---

### degree_course_requirements
Marks a course as **mandatory** for a specific degree track.

| Column       | Type                                     | Description     |
|--------------|------------------------------------------|-----------------|
| `id`         | SERIAL PK                                | Auto-increment  |
| `track_code` | VARCHAR(20) → `degree_tracks.track_code` | Degree track    |
| `course_id`  | VARCHAR(20) → `courses.course_id`        | Required course |

**Example**: AE requires Propulsion Principles (`-6`).

---

### degree_group_requirements
Marks a course group as mandatory or elective for a degree track.

| Column       | Type                                     | Description                                                     |
|--------------|------------------------------------------|-----------------------------------------------------------------|
| `id`         | SERIAL PK                                | Auto-increment                                                  |
| `track_code` | VARCHAR(20) → `degree_tracks.track_code` | Degree track                                                    |
| `group_id`   | INT → `course_groups.group_id`           | Target group                                                    |
| `is_main`    | BOOLEAN                                  | `TRUE` = must fully satisfy the group; `FALSE` = elective group |

**Example**: AE has `1A → is_main=TRUE`, `1B → is_main=FALSE`.

---

### degree_choice_requirements
Degree‑specific override of a `choice_sets` constraint (e.g. "AE students must pick at least 1 from this set, while other tracks have no restriction").

| Column       | Type                                     | Description                                                          |
|--------------|------------------------------------------|----------------------------------------------------------------------|
| `id`         | SERIAL PK                                | Auto-increment                                                       |
| `track_code` | VARCHAR(20) → `degree_tracks.track_code` | Degree track                                                         |
| `set_id`     | INT → `choice_sets.set_id`               | The choice set being constrained                                     |
| `min_select` | INT                                      | Minimum courses for this degree (overrides `choice_sets.min_select`) |
| `max_select` | INT                                      | Maximum courses for this degree (overrides `choice_sets.max_select`) |

**Example**: AE overrides the "Astrodynamics / Flight Dynamics" set to `min_select=1`.
