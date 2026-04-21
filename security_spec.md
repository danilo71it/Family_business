# Security Specification for FamigliAffari

## Data Invariants
1. A transaction MUST belong to a groupId where the user is a member.
2. A user can only read/write their own User profile.
3. A group can only be read/updated by its members.
4. `userId` in a transaction must match the `request.auth.uid`.
5. `groupId` in a transaction must match a valid group where the user is a member.

## The Dirty Dozen (Attacker Payloads)
1. **Identity Spoofing**: Attempt to write a transaction with another user's `userId`.
2. **Cross-Group Leak**: Attempt to read transactions from a `groupId` I don't belong to.
3. **Privilege Escalation**: Attempt to add myself to a group I don't own.
4. **ID Poisoning**: Use a 1MB string as a transaction ID.
5. **Type Confusion**: Send a string for the `amount` field.
6. **State Skip**: Update `createdAt` field which should be immutable.
7. **Orphan Write**: Create a transaction for a non-existent groupId.
8. **Shadow Update**: Add `isAdmin: true` to a User document.
9. **Timestamp Spoofing**: Provide a future `createdAt` from the client.
10. **Resource Exhaustion**: Send a transaction description that is 500KB.
11. **Negative Amount**: Send a negative number for amount (if not allowed, though zero/positive is expected).
12. **Unauthorized Deletion**: Try to delete someone else's group.

## Rules Design
- `isValidUser(data)`: Checks uid, email, etc.
- `isValidTransaction(data)`: Checks amount (number), type, category, date.
- `isValidGroup(data)`: Checks name, ownerId, members list.
