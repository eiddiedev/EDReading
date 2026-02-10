import { openDB } from 'idb';

const DB_NAME = 'edreading-db';
const STORE_NAME = 'books';

export interface Book {
  id: string;
  title: string;
  cover?: string; // URL or Blob
  data?: Blob | ArrayBuffer; // Optional now, stored in book-storage
  author?: string;
  createdAt: number;
  position?: string | number; // Last read position
  progress?: number; // Reading progress percentage (0-100)
}

export async function initDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

export async function saveBook(book: Book) {
  const db = await initDB();
  return db.put(STORE_NAME, book);
}

export async function getBook(id: string): Promise<Book | undefined> {
  const db = await initDB();
  return db.get(STORE_NAME, id);
}

export async function getAllBooks(): Promise<Book[]> {
  const db = await initDB();
  return db.getAll(STORE_NAME);
}

export async function deleteBook(id: string) {
  const db = await initDB();
  return db.delete(STORE_NAME, id);
}

export async function updateBookProgress(id: string, position: string | number, progress: number) {
  const db = await initDB();
  const book = await db.get(STORE_NAME, id);
  if (book) {
    book.position = position;
    book.progress = progress;
    await db.put(STORE_NAME, book);
  }
}
