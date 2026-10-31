/**
 * سیستم ذخیره‌سازی آفلاین جزوات و سرفصل‌های درسی (Mehestan Offline Cache)
 * مبتنی بر IndexedDB جهت دسترسی سریع بدون نیاز به اینترنت
 */

const DB_NAME = 'mehestan_offline_db';
const DB_VERSION = 1;
const STORE_COURSES = 'courses_cache';
const STORE_FILES = 'files_cache';

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('مرورگر شما از حافظه محلی آفلاین پشتیبانی نمی‌کند.'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_COURSES)) {
        db.createObjectStore(STORE_COURSES, { keyPath: 'courseId' });
      }
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: 'fileUrl' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * ذخیره سرفصل‌ها و محتوای یک درس در حافظه آفلاین
 */
export async function cacheCourseContents(courseId, contents, courseName = '') {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_COURSES, 'readwrite');
      const store = tx.objectStore(STORE_COURSES);
      store.put({
        courseId: String(courseId),
        courseName,
        contents,
        cachedAt: Date.now(),
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Offline cache write failed:', err);
    return false;
  }
}

/**
 * بازیابی سرفصل‌های ذخیره‌شده یک درس از حافظه آفلاین
 */
export async function getCachedCourseContents(courseId) {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_COURSES, 'readonly');
      const store = tx.objectStore(STORE_COURSES);
      const req = store.get(String(courseId));
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Offline cache read failed:', err);
    return null;
  }
}

/**
 * ذخیره باینری یک فایل (جزوه یا صورت سوال) در حافظه آفلاین
 */
export async function cacheFileBlob(fileUrl, filename, blob) {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, 'readwrite');
      const store = tx.objectStore(STORE_FILES);
      store.put({
        fileUrl,
        filename,
        blob,
        cachedAt: Date.now(),
        size: blob.size,
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('File cache write failed:', err);
    return false;
  }
}

/**
 * دریافت فایل از حافظه آفلاین
 */
export async function getCachedFileBlob(fileUrl) {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, 'readonly');
      const store = tx.objectStore(STORE_FILES);
      const req = store.get(fileUrl);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    return null;
  }
}
