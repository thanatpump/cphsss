import Link from 'next/link';

const UPLOAD_LINKS = [
  { href: '/upload-signstmm', label: 'อัปโหลด SIGNSTMM (ผู้ป่วยใน)' },
  { href: '/upload-signstms', label: 'อัปโหลด SIGNSTMS (ผู้ป่วยในสรุป)' },
  { href: '/upload-sognstmm', label: 'อัปโหลด SOGNSTMM (ผู้ป่วยนอก)' },
  { href: '/upload-sognstmp', label: 'อัปโหลด SOGNSTMP (ผู้ป่วยนอกพิเศษ)' },
  { href: '/data-match', label: 'ชน InvNo กับ authen' },
] as const;

export default function UploadPage() {
  return (
    <div className="app-shell relative min-h-screen flex flex-col items-center justify-center p-4">
      <div className="relative z-[1] app-card p-8 max-w-md w-full shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[#1a7a6d] font-semibold hover:underline"
          >
            ← ย้อนกลับ
          </Link>
        </div>
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-[#1a7a6d] rounded-md flex items-center justify-center mx-auto mb-4">
            <span
              className="text-white text-sm font-semibold tracking-[0.14em]"
              style={{ fontFamily: 'var(--font-ibm-plex)' }}
            >
              SSO
            </span>
          </div>
          <h1
            className="text-2xl font-semibold text-[#0b3d4a] mb-2"
            style={{ fontFamily: 'var(--font-ibm-plex)' }}
          >
            อัปโหลดข้อมูลกลาง
          </h1>
          <p className="text-[#5c6b73] text-sm">เลือกประเภทข้อมูลที่ต้องการอัปโหลดเข้าสู่ระบบ</p>
        </div>
        <div className="flex flex-col gap-3">
          {UPLOAD_LINKS.map((item) => (
            <Link key={item.href} href={item.href}>
              <button className="app-btn-primary w-full py-3 rounded-md font-semibold text-white">
                {item.label}
              </button>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
