# 📋 BÁO CÁO KIỂM TRA TOÀN BỘ DỰ ÁN

**Ngày kiểm tra:** $(date)  
**Phạm vi:** Toàn bộ codebase  
**Mục đích:** Phát hiện các chức năng chưa hoạt động, logic chưa đúng, và các vấn đề tiềm ẩn

---

## 🔴 VẤN ĐỀ NGHIÊM TRỌNG (CRITICAL)

### 1. **Race Condition trong Tạo Đầu Tư** ⚠️
**File:** `app/api/investments/route.ts` (POST method, dòng 380-394)

**Vấn đề:**
- Trừ tiền ví và tạo investment không có transaction wrapper (do Neon serverless không hỗ trợ)
- Nếu lỗi xảy ra giữa 2 bước, có thể dẫn đến:
  - Mất tiền: Tiền đã trừ nhưng investment chưa tạo
  - Hoặc ngược lại: Investment đã tạo nhưng tiền chưa trừ

**Mô tả chi tiết:**
```typescript
// Bước 1: Trừ tiền (dòng 383-387)
await sql`UPDATE users SET wallet_balance = wallet_balance - ${amount} ...`;

// Bước 2: Tạo investment (dòng 390-394)
await sql`INSERT INTO investments ...`;
```

**Hậu quả:** Nếu lỗi xảy ra ở bước 2, tiền đã bị trừ nhưng không có investment record.

**Khuyến nghị:** 
- Thêm cơ chế rollback tự động nếu bước 2 thất bại
- Hoặc kiểm tra và hoàn tiền nếu investment không được tạo thành công

---

### 2. **Logic Hoàn Tiền Khi Phê Duyệt Đơn Hàng** ✅ ĐÃ XÁC NHẬN
**File:** `app/api/admin/orders/route.ts` (PUT method, dòng 247-256)

**Trạng thái:** ✅ **ĐÃ XÁC NHẬN - ĐÚNG BUSINESS LOGIC**

**Giải thích:**
- Đây là mô hình **Cashback** - User mua hàng và được hoàn lại tiền + hoa hồng
- Khi tạo đơn hàng: Tiền được trừ từ ví (để đảm bảo user có đủ tiền)
- Khi admin phê duyệt: Hoàn lại tiền gốc + hoa hồng (user mua hàng miễn phí + được hoa hồng)
- Khi admin từ chối: Chỉ hoàn lại tiền gốc, không có hoa hồng

**Đã sửa:**
- ✅ Thêm comment giải thích rõ ràng về business logic (Cashback model)
- ✅ Thêm comment trong `app/api/orders/route.ts` để giải thích tại sao trừ tiền khi tạo đơn

---

### 3. **Rút Tiền Tự Động Trừ Tiền Trước Khi Admin Duyệt** ⚠️
**File:** `app/api/transactions/route.ts` (POST method, dòng 233-240)

**Vấn đề:**
- Khi user tạo yêu cầu rút tiền (`type = 'withdraw'`), tiền ngay lập tức bị trừ từ ví
- Transaction vẫn ở trạng thái `pending`, chờ admin duyệt
- Nếu admin từ chối, tiền mới được hoàn lại

**Mô tả chi tiết:**
```typescript
// Khi tạo yêu cầu rút tiền (dòng 233-240)
if (validatedData.type === 'withdraw') {
  // Trừ tiền ngay lập tức
  await sql`
    UPDATE users 
    SET wallet_balance = wallet_balance - ${validatedData.amount}
    ...
  `;
  // Status vẫn là 'pending' để admin duyệt
}
```

**Hậu quả:**
- User không thể sử dụng số tiền đã yêu cầu rút trong thời gian chờ duyệt
- Nếu admin từ chối, tiền mới được hoàn lại, nhưng user đã mất quyền sử dụng trong thời gian chờ

**Khuyến nghị:**
- Xem xét lại logic: Có nên trừ tiền ngay khi tạo yêu cầu rút, hay chỉ trừ khi admin duyệt?
- Nếu giữ logic hiện tại, cần thông báo rõ ràng cho user rằng tiền sẽ bị "đóng băng" trong thời gian chờ duyệt

---

## 🟡 VẤN ĐỀ QUAN TRỌNG (HIGH PRIORITY)

### 4. **Race Condition Khi Cập Nhật Số Lượng Giỏ Hàng** ⚠️
**File:** `app/api/cart/route.ts` (PUT method, dòng 332-396)

**Vấn đề:**
- Khi cập nhật số lượng trong giỏ hàng, chỉ kiểm tra stock một lần trước khi update
- Không có cơ chế đảm bảo stock vẫn còn đủ khi thực hiện update
- Nếu nhiều user cùng cập nhật giỏ hàng của cùng một sản phẩm có stock thấp, có thể dẫn đến stock âm

**Mô tả chi tiết:**
```typescript
// Kiểm tra stock (dòng 363-375)
const cartItem = await sql`SELECT ci.product_id, p.stock ...`;

if (cartItem[0].stock < quantity) {
  return error;
}

// Update quantity (dòng 384-388)
await sql`UPDATE cart_items SET quantity = ${quantity} ...`;
```

**Hậu quả:** Stock có thể bị âm nếu nhiều user cùng cập nhật.

**Khuyến nghị:**
- Thêm điều kiện kiểm tra stock trong câu lệnh UPDATE
- Hoặc sử dụng atomic operation để đảm bảo stock >= quantity

---

### 5. **Tính Lợi Nhuận Đầu Tư Có Thể Bị Trùng** ⚠️
**File:** `app/api/cron/calculate-daily-profit/route.ts` (GET method, dòng 78-134)

**Vấn đề:**
- Cron job tính lợi nhuận dựa trên `last_profit_calculated_at`
- Nếu cron job chạy nhiều lần trong cùng một ngày (do lỗi hoặc manual trigger), có thể tính trùng lợi nhuận
- Logic hiện tại chỉ kiểm tra `daysSinceLastCalculation < 1`, nhưng không đảm bảo idempotency

**Mô tả chi tiết:**
```typescript
// Tính số ngày đã trôi qua (dòng 88-91)
const daysSinceLastCalculation = Math.floor((nowTime - lastCalculatedTime) / (1000 * 60 * 60 * 24));

// Chỉ tính nếu >= 1 ngày (dòng 94-96)
if (daysSinceLastCalculation < 1) {
  continue;
}
```

**Hậu quả:** Nếu cron job chạy 2 lần trong cùng một ngày (sau khi đã qua 1 ngày), lợi nhuận có thể bị tính 2 lần.

**Khuyến nghị:**
- Thêm cơ chế đảm bảo idempotency (ví dụ: chỉ tính lợi nhuận cho ngày hôm nay nếu chưa tính)
- Hoặc sử dụng lock mechanism để tránh tính trùng

---

### 6. **Xử Lý Expired Investments Có Thể Chạy Nhiều Lần** ⚠️
**File:** `app/api/investments/route.ts` (GET method, dòng 148-154)

**Vấn đề:**
- Hàm `processExpiredInvestments` được gọi mỗi khi user GET investments
- Nếu nhiều user cùng GET investments, hàm này có thể chạy đồng thời nhiều lần cho cùng một investment
- Mặc dù có điều kiện `status = 'active'`, nhưng không có lock mechanism để tránh race condition

**Mô tả chi tiết:**
```typescript
// Gọi trong background (dòng 148-154)
processExpiredInvestments(decoded.userId).catch((error) => {
  // ...
});
```

**Hậu quả:** 
- Có thể hoàn tiền nhiều lần cho cùng một investment nếu nhiều request chạy đồng thời
- Wallet balance có thể bị tăng không đúng

**Khuyến nghị:**
- Chuyển logic này sang cron job thay vì chạy trong GET request
- Hoặc thêm cơ chế lock/distributed lock để đảm bảo chỉ xử lý một lần

---

### 7. **Thiếu Kiểm Tra Số Dư Ví Trước Khi Trừ Tiền (Investment)** ⚠️
**File:** `app/api/investments/route.ts` (POST method, dòng 383-387)

**Vấn đề:**
- Khi tạo investment, chỉ SELECT để kiểm tra số dư (dòng 291-315)
- Sau đó UPDATE trừ tiền mà không có điều kiện kiểm tra số dư trong câu lệnh UPDATE
- Nếu số dư thay đổi giữa SELECT và UPDATE (do transaction khác), có thể trừ tiền khi số dư không đủ

**Mô tả chi tiết:**
```typescript
// Kiểm tra số dư (dòng 291-315)
const user = await sql`SELECT is_frozen, wallet_balance FROM users ...`;
if (walletBalance < amount) {
  return error;
}

// Trừ tiền (dòng 383-387) - KHÔNG có điều kiện kiểm tra số dư
await sql`UPDATE users SET wallet_balance = wallet_balance - ${amount} ...`;
```

**Khuyến nghị:**
- Thêm điều kiện `wallet_balance >= ${amount}` trong câu lệnh UPDATE
- Sử dụng RETURNING để kiểm tra xem có trừ được tiền không

---

## 🟢 VẤN ĐỀ TRUNG BÌNH (MEDIUM PRIORITY)

### 8. **Thiếu Validation Cho Một Số Input** ⚠️
**File:** Nhiều file

**Vấn đề:**
- Một số API endpoint thiếu validation cho input
- Ví dụ: `app/api/admin/transactions/route.ts` không validate `transaction_id` có thuộc về user nào không

**Khuyến nghị:**
- Thêm validation đầy đủ cho tất cả input
- Sử dụng Zod schema cho tất cả API endpoints

---

### 9. **Error Handling Không Đồng Nhất** ⚠️
**File:** Nhiều file

**Vấn đề:**
- Một số file sử dụng `handleError`, một số file tự xử lý error
- Một số file log error, một số file không log

**Khuyến nghị:**
- Standardize error handling across all API routes
- Sử dụng `handleError` và `logger` nhất quán

---

### 10. **Thiếu Kiểm Tra Quyền Truy Cập Ở Một Số Endpoint** ⚠️
**File:** `app/api/user/category-permissions/route.ts`

**Vấn đề:**
- Endpoint GET category permissions không có validation đặc biệt, nhưng cần đảm bảo user chỉ xem được permissions của chính mình

**Khuyến nghị:**
- Thêm validation để đảm bảo user chỉ truy cập được data của chính mình

---

## 📊 TỔNG KẾT

### Số Lượng Vấn Đề:
- 🔴 **Nghiêm trọng (Critical):** 3 vấn đề
- 🟡 **Quan trọng (High Priority):** 4 vấn đề
- 🟢 **Trung bình (Medium Priority):** 3 vấn đề

### Ưu Tiên Sửa:
1. **Logic hoàn tiền khi phê duyệt đơn hàng** (Critical #2) - Cần xác nhận lại business logic
2. **Race condition trong tạo đầu tư** (Critical #1) - Cần thêm rollback mechanism
3. **Rút tiền tự động trừ tiền** (Critical #3) - Cần xem xét lại logic
4. **Xử lý expired investments có thể chạy nhiều lần** (High #6) - Cần chuyển sang cron job
5. **Thiếu kiểm tra số dư ví trước khi trừ tiền** (High #7) - Cần thêm điều kiện trong UPDATE

### Lưu Ý:
- Tất cả các vấn đề trên đều liên quan đến **tính nhất quán dữ liệu (data consistency)** và **race conditions**
- Do Neon SQL serverless không hỗ trợ transaction wrapper (`sql.begin()`), cần sử dụng **optimistic concurrency control** và **atomic operations**
- Các vấn đề về logic business (như hoàn tiền khi phê duyệt đơn hàng) cần được xác nhận lại với product owner

---

**Kết luận:** Dự án có một số vấn đề nghiêm trọng về data consistency và race conditions, đặc biệt liên quan đến xử lý tiền (wallet balance) và stock. Cần ưu tiên sửa các vấn đề Critical trước khi deploy production.
