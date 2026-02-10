import { openDB } from 'idb';

const DB_NAME = 'ai-hub-library';
const STORE_NAME = 'books';

// Initialize DB
export const initDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
};

// Save File (Strict Blob Check)
export const saveBookFile = async (id: string, file: File | Blob) => {
  if (!file || file.size === 0) throw new Error("File is empty");
  
  console.log(`💾 Saving book [${id}] size: ${file.size} type: ${file.type}`);
  const db = await initDB();
  
  // Force convert to Blob to ensure clean storage
  const blob = new Blob([file], { type: 'application/epub+zip' });
  await db.put(STORE_NAME, blob, id);
  console.log("✅ Save complete.");
};

// Get File
export const getBookFile = async (id: string): Promise<Blob | undefined> => {
  const db = await initDB();
  return db.get(STORE_NAME, id);
};

// Delete File
export const deleteBookFile = async (id: string) => {
  const db = await initDB();
  await db.delete(STORE_NAME, id);
};