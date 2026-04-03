/**
 * IndexedDB 存储工具 (Storage)
 * 作用：管理浏览器端的 IndexedDB 数据库，用于存储大文件和离线数据。
 * 定义：基于 `idb` 库封装的数据库操作函数。
 * 逻辑：
 * 1. 初始化 `ai-hub-library` 数据库，包含书籍元数据、文件内容和文章三个 Store。
 * 2. 提供书籍文件的存取 (`saveBookFile`, `getBookFile`)。
 * 3. 提供文章和进度的持久化操作。
 * 4. 支持大容量数据的离线存储，弥补 LocalStorage 的不足。
 */
import { openDB } from 'idb';
import { Article } from "@/types";

const DB_NAME = 'ai-hub-library';
const METADATA_STORE = 'books';
const FILE_STORE = 'book_files';
const ARTICLE_STORE = 'articles';

export interface Book {
  id: string;
  title: string;
  author?: string;
  cover?: string;
  createdAt: number;
  progress?: number;
  position?: string | number;
}

export const initDB = async () => {
  return openDB(DB_NAME, 4, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        db.createObjectStore(METADATA_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(FILE_STORE)) {
        db.createObjectStore(FILE_STORE);
      }
      if (!db.objectStoreNames.contains(ARTICLE_STORE)) {
        db.createObjectStore(ARTICLE_STORE, { keyPath: 'id' });
      }
    },
  });
};

export const saveBookFile = async (id: string, file: File | Blob) => {
  const db = await initDB();
  await db.put(FILE_STORE, file, id);
};

export const getBookFile = async (id: string): Promise<Blob | undefined> => {
  const db = await initDB();
  return db.get(FILE_STORE, id);
};

export const saveBook = async (book: Book) => {
  const db = await initDB();
  const tx = db.transaction(METADATA_STORE, 'readwrite');
  const store = tx.objectStore(METADATA_STORE);
  if (store.keyPath) {
    await store.put(book);
  } else {
    await store.put(book, book.id);
  }
  await tx.done;
};

export const saveArticle = async (article: Article) => {
  const db = await initDB();
  const tx = db.transaction(ARTICLE_STORE, 'readwrite');
  const store = tx.objectStore(ARTICLE_STORE);
  if (store.keyPath) {
    await store.put(article);
  } else {
    await store.put(article, article.id);
  }
  await tx.done;
};

export const getBook = async (id: string): Promise<Book | undefined> => {
  const db = await initDB();
  return db.get(METADATA_STORE, id);
};

export const getAllBooks = async (): Promise<Book[]> => {
  const db = await initDB();
  return db.getAll(METADATA_STORE);
};

export const deleteBook = async (id: string) => {
  const db = await initDB();
  const tx = db.transaction([METADATA_STORE, FILE_STORE], 'readwrite');
  await tx.objectStore(METADATA_STORE).delete(id);
  await tx.objectStore(FILE_STORE).delete(id);
  await tx.done;
};

export const updateBookProgress = async (
  id: string,
  position: string | number,
  progress: number
) => {
  const db = await initDB();
  const book = await db.get(METADATA_STORE, id);
  if (book) {
    book.progress = progress;
    book.position = position;
    const tx = db.transaction(METADATA_STORE, 'readwrite');
    const store = tx.objectStore(METADATA_STORE);
    if (store.keyPath) {
      await store.put(book);
    } else {
      await store.put(book, id);
    }
    await tx.done;
  }
};

export const deleteArticle = async (id: string) => {
  const db = await initDB();
  await db.delete(ARTICLE_STORE, id);
};

export const getAllArticles = async (): Promise<Article[]> => {
  const db = await initDB();
  return db.getAll(ARTICLE_STORE);
};

export const getArticle = async (id: string): Promise<Article | undefined> => {
  const db = await initDB();
  return db.get(ARTICLE_STORE, id);
};

export const clearLibrary = async () => {
  const db = await initDB();
  const tx = db.transaction([METADATA_STORE, FILE_STORE], 'readwrite');
  await tx.objectStore(METADATA_STORE).clear();
  await tx.objectStore(FILE_STORE).clear();
  await tx.done;
};
