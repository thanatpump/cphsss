/**
 * In-memory storage สำหรับเก็บข้อมูลบัตรที่ Desktop App ส่งมา
 * ใน Production อาจใช้ Redis หรือ Database แทน
 */

interface CardData {
  citizen_id: string;
  title_th: string;
  first_name_th: string;
  last_name_th: string;
  birth_date: string;
  address: string;
  issue_date: string;
  expire_date: string;
  timestamp: number;
}

// เก็บข้อมูลบัตรล่าสุด (key: session_id หรือ 'latest')
const cardDataStorage = new Map<string, CardData>();

// เก็บข้อมูลล่าสุด (ไม่ต้องใช้ session)
let latestCardData: CardData | null = null;

/**
 * เก็บข้อมูลบัตร
 */
export function storeCardData(cardData: Omit<CardData, 'timestamp'>): void {
  const data: CardData = {
    ...cardData,
    timestamp: Date.now()
  };
  
  latestCardData = data;
  cardDataStorage.set('latest', data);
  
  // ลบข้อมูลเก่าที่เกิน 5 นาที
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  for (const [key, value] of cardDataStorage.entries()) {
    if (value.timestamp < fiveMinutesAgo && key !== 'latest') {
      cardDataStorage.delete(key);
    }
  }
}

/**
 * อ่านข้อมูลบัตรล่าสุด
 */
export function getLatestCardData(): CardData | null {
  return latestCardData;
}

/**
 * ลบข้อมูลบัตร
 */
export function clearCardData(): void {
  latestCardData = null;
  cardDataStorage.clear();
}

/**
 * ตรวจสอบว่ามีข้อมูลใหม่หรือไม่ (ภายใน 30 วินาที)
 */
export function hasRecentCardData(maxAgeSeconds: number = 30): boolean {
  if (!latestCardData) return false;
  
  const maxAge = maxAgeSeconds * 1000;
  const age = Date.now() - latestCardData.timestamp;
  
  return age < maxAge;
}





