// Auth service — implemented in Week 6.
// requestLink(email): upsert user, create magic_link row, send email.
// consumeLink(token): hash token, find row, check expiry, mark consumed,
//                     create session, return session id.
// logout(sessionId): delete session row.
export {};
