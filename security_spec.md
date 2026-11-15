# PennyPals Security Specification

## 1. Data Invariants
1. **PII Isolation**: User emails live solely in `/users/{userId}` and are strictly readable/writable only by `request.auth.uid == userId`. No `list` access is permitted on `/users`.
2. **Group Membership Boundary**: Only authenticated users listed in `/groups/{groupId}.memberIds` may read group metadata, member cards, or expenses.
3. **Invite Code Lookup Without Enumeration**: `/groupInvites/{inviteCode}` permits `get` by signed-in users who know the exact code, while `list` is strictly denied (`allow list: if false`).
4. **Author-Only Expense Mutation**: Any group member may read all expenses in their group, but only the `authorId` (`existing().authorId == request.auth.uid`) may update or delete an expense.
5. **Strict Bounds & Temporal Integrity**: All timestamps (`createdAt`, `updatedAt`, `joinedAt`) must equal `request.time`. All IDs match `^[a-zA-Z0-9_\-]+$` (`<= 128` chars). All amounts are positive integers (`1 <= amountCents <= 10000000`).

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Cross-User Profile Read**: User B attempts `get /users/userA`.
2. **User Enumeration**: Signed-in user attempts `list /users`.
3. **Shadow Field Injection on User**: User A attempts `create /users/userA` with extra key `"isAdmin": true`.
4. **Invite Code Scraping**: User B attempts `list /groupInvites`.
5. **Non-Member Group Expense Read**: User C (not in `memberIds`) attempts `list /groups/group1/expenses`.
6. **Expense Author Spoofing**: User B (member of `group1`) attempts `create /groups/group1/expenses/exp1` with `"authorId": "userA"`.
7. **Cross-Member Expense Edit**: User B attempts `update /groups/group1/expenses/expOwnedByUserA`.
8. **Cross-Member Expense Delete**: User B attempts `delete /groups/group1/expenses/expOwnedByUserA`.
9. **Negative or Float Expense Amount**: User A attempts `create /groups/group1/expenses/exp2` with `"amountCents": -500` or `12.5`.
10. **Invalid Category Injection**: User A attempts `create /groups/group1/expenses/exp3` with `"category": "crypto_scam"`.
11. **Backdated Server Timestamp Spoofing**: User A attempts `create /groups/group1/expenses/exp4` with `"createdAt": "2020-01-01T00:00:00Z"`.
12. **Unverified Email Write**: Unverified auth token (`email_verified: false`) attempts `create /groups/group1/expenses/exp5`.
