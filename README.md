# ຫໍສະໝຸດ e-book 3D

เว็บอ่านหนังสืออีบุ๊กด้วย Node.js, Express, better-sqlite3, Three.js และ StPageFlip โดยหน้า UI ใช้ภาษาลาวจาก `lo.json` ผ่าน `t(key)`.

## โครงสร้างโฟลเดอร์

```text
project_store_ebooks/
├── data/                     # ฐานข้อมูล SQLite (สร้างอัตโนมัติ)
├── public/
│   ├── app.js                # frontend และ t(key)
│   ├── index.html            # โครงหน้า HTML (lang="lo")
│   └── styles.css            # responsive, Noto Sans Lao, หน้าหนังสือ
├── scripts/
│   └── create-admin.js       # สร้างหรือรีเซ็ตรหัสผ่าน admin
├── src/
│   ├── auth.js               # JWT middleware
│   ├── database.js           # better-sqlite3 และโหลด schema
│   └── routes.js             # API และ prepared statements
├── .env.example
├── lo.json                   # ข้อความ UI/error ภาษาลาว
├── schema.sql                # schema 8 ตารางจากไฟล์แนบ
├── package.json
└── server.js
```

## ติดตั้งและรัน

ต้องใช้ Node.js รุ่น LTS ที่รองรับ better-sqlite3 และ Python/เครื่องมือ build บน Windows หากไม่มี prebuilt binary.

```powershell
npm install
Copy-Item .env.example .env
```

แก้ `.env` ก่อนเปิดเว็บ โดยตั้ง `JWT_SECRET` เป็นค่าสุ่มยาวอย่างน้อย 32 ตัว และตั้ง `ADMIN_PASSWORD` ที่ปลอดภัยอย่างน้อย 12 ตัว จากนั้นรัน:

```powershell
npm run db:admin
npm run dev
```

เปิด `http://localhost:3000`. ฐานข้อมูล `data/library.sqlite` จะถูกสร้างจาก `schema.sql` ในการเริ่มครั้งแรก พร้อมหนังสือ/หมวดตัวอย่างที่ schema มีให้. Admin ที่สร้างด้วยคำสั่งนี้ล็อกอินด้วย `ADMIN_EMAIL` และ `ADMIN_PASSWORD` แล้วจะเห็นปุ่มจัดการสำหรับเพิ่มหนังสือและแยกหน้าโดยใช้บรรทัด `---`.

## วิธีทดสอบด้วยมือ

1. เปิดหน้าแรก ตรวจภาษาລາວ, ค้นหาหนังสือ, กรองหมวด และเปลี่ยนโหมดมืด/สว่าง.
2. ลากปก 3D เพื่อหมุน แล้วเปิดหนังสือและพลิกหน้าด้วยการลากหรือปุ่มก่อนหน้า/ถัดไป.
3. สมัครบัญชีผู้อ่าน แล้วทดลองรีวิว 1–5 ดาว, เพิ่มที่คั่น และกลับมาอ่านต่อ; รีเฟรชหน้าเพื่อตรวจความคืบหน้า.
4. ออกจากระบบ แล้วล็อกอินด้วย admin จาก `.env`; เพิ่มหนังสือพร้อมหลายหน้า แล้วตรวจว่าหนังสือปรากฏในรายการ.
5. ตรวจ API สุขภาพด้วย `Invoke-RestMethod http://localhost:3000/api/health`.

## API หลัก

- `POST /api/auth/register`, `POST /api/auth/login`
- `GET /api/books`, `GET /api/books/:id`, `GET /api/books/:id/pages`
- `GET/POST /api/books/:id/reviews`
- `GET/PUT /api/books/:id/progress`
- `GET/POST /api/bookmarks` (เพิ่มที่คั่นใช้ `POST /api/books/:id/bookmarks`), `DELETE /api/bookmarks/:id`
- `POST /api/admin/books` (JWT role admin)

ค่าจาก client ทุกจุดผูกเป็น parameter ของ prepared statement; ชื่อคอลัมน์/เงื่อนไข query ถูกกำหนดใน server. bcrypt ใช้ hash cost 12 และ JWT มีอายุ 7 วัน. Three.js โหลดด้วย ES module และ StPageFlip ใช้ browser build จาก CDN จึงต้องเชื่อมต่ออินเทอร์เน็ตตอนเปิดหน้า.
