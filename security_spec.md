# Security Spec: SmartGarage Pro

## Data Invariants
1. A Vehicle must have an ownerId matching a User of role 'customer'.
2. A JobCard must link to existing Vehicle and Customer IDs.
3. Inventory changes must be logged or reflect current stock levels accurately.
4. Financial transactions are immutable once created (only corrective transactions allowed).
5. User roles are immutable via client-side updates after initial creation.

## The "Dirty Dozen" Payloads (Denial Tests)
1. Unauthorized profile update (changing role to 'super_admin').
2. Creating a JobCard for a vehicle the user doesn't own (from customer side).
3. Deleting inventory items (disabled for most roles).
4. Updating another customer's vehicle mileage.
5. Marking a job card as 'delivered' without being a cashier or manager.
6. Reading financial reports as a mechanic.
7. Injecting 1MB strings into plateNumber.
8. Self-assigning a branchId without permission.
9. Modifying 'createdAt' timestamps.
10. Listing all users (PII leak).
11. Updating a terminal 'completed' job card fields other than status to 'delivered'.
12. Accessing camera feeds without 'security' or 'manager' role.

## Rule Architecture
- Master Gate: All sub-resources check parent branch or user context.
- Identity: `request.auth.uid` must match `resource.data.uid` or `ownerId`.
- Role-Based: `get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role` checks.
