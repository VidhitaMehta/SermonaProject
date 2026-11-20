import { collection, doc, getDocs, limit, query, runTransaction, where, type DocumentReference, type Firestore } from 'firebase/firestore';

/** Collect first, then delete atomically so a failed request leaves the workspace intact. */
export async function deleteOwnedWorkspace(db: Firestore, projectId: string, ownerId: string) {
  const root = doc(db, 'projects', projectId);
  const references: DocumentReference[] = [];
  const append = (entries: DocumentReference[]) => {
    references.push(...entries);
    if (references.length > 450) {
      throw new Error('This workspace exceeds the browser deletion limit. Nothing was deleted. A server-side cleanup is required.');
    }
  };

  const channels = await getDocs(query(collection(root, 'channels'), limit(451)));
  append(channels.docs.map((entry) => entry.ref));
  for (const channel of channels.docs) {
    const messages = await getDocs(query(collection(channel.ref, 'messages'), limit(451)));
    append(messages.docs.map((entry) => entry.ref));
  }
  for (const name of ['tasks', 'decisions', 'members', 'analyses', 'joinRequests']) {
    const snapshot = await getDocs(query(collection(root, name), limit(451)));
    append(snapshot.docs.map((entry) => entry.ref));
  }
  const invites = await getDocs(query(collection(db, 'recruitInvites'), where('projectId', '==', projectId), limit(451)));
  append(invites.docs.map((entry) => entry.ref));

  await runTransaction(db, async (transaction) => {
    const project = await transaction.get(root);
    if (!project.exists() || project.data().ownerId !== ownerId) {
      throw new Error('Only the current workspace owner can delete this workspace.');
    }
    for (const reference of references) transaction.delete(reference);
    transaction.delete(root);
  });
}
