/**
 * Script test performance cho các endpoints đã tối ưu
 * Chạy: npx tsx scripts/test-performance.ts
 * 
 * Yêu cầu: Server phải đang chạy (npm run dev)
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  responseTime: number;
  success: boolean;
  error?: string;
}

async function testEndpoint(
  name: string,
  method: string,
  path: string,
  body?: any,
  headers?: Record<string, string>
): Promise<TestResult> {
  const startTime = Date.now();
  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, options);
    const responseTime = Date.now() - startTime;
    const data = await response.json().catch(() => ({}));

    return {
      endpoint: name,
      method,
      status: response.status,
      responseTime,
      success: response.ok,
      error: response.ok ? undefined : (data.error || `HTTP ${response.status}`),
    };
  } catch (error: any) {
    return {
      endpoint: name,
      method,
      status: 0,
      responseTime: Date.now() - startTime,
      success: false,
      error: error.message || 'Network error',
    };
  }
}

async function runTests() {
  console.log('🚀 Bắt đầu test performance...\n');
  console.log(`API Base URL: ${API_BASE_URL}\n`);

  const results: TestResult[] = [];

  // Test 1: GET /api/investments (đã tối ưu - tách business logic)
  console.log('📊 Test 1: GET /api/investments (Tối ưu: Tách business logic)');
  console.log('   - Expected: Response time < 500ms (trước: 2-3s)');
  console.log('   - Note: Cần auth token để test\n');
  
  // Test 2: GET /api/settings/investment-rate (đã thêm caching)
  console.log('📊 Test 2: GET /api/settings/investment-rate (Tối ưu: Caching)');
  const result1 = await testEndpoint(
    'Investment Rates (First Call)',
    'GET',
    '/api/settings/investment-rate'
  );
  results.push(result1);
  console.log(`   Status: ${result1.status}, Time: ${result1.responseTime}ms`);
  
  // Test cache hit
  const result2 = await testEndpoint(
    'Investment Rates (Cached)',
    'GET',
    '/api/settings/investment-rate'
  );
  results.push(result2);
  console.log(`   Status: ${result2.status}, Time: ${result2.responseTime}ms`);
  console.log(`   Cache improvement: ${result1.responseTime - result2.responseTime}ms faster\n`);

  // Test 3: GET /api/banners (đã thêm caching)
  console.log('📊 Test 3: GET /api/banners (Tối ưu: Caching)');
  const result3 = await testEndpoint(
    'Banners (First Call)',
    'GET',
    '/api/banners'
  );
  results.push(result3);
  console.log(`   Status: ${result3.status}, Time: ${result3.responseTime}ms`);
  
  const result4 = await testEndpoint(
    'Banners (Cached)',
    'GET',
    '/api/banners'
  );
  results.push(result4);
  console.log(`   Status: ${result4.status}, Time: ${result4.responseTime}ms`);
  console.log(`   Cache improvement: ${result3.responseTime - result4.responseTime}ms faster\n`);

  // Test 4: GET /api/categories (đã có caching sẵn)
  console.log('📊 Test 4: GET /api/categories (Đã có caching)');
  const result5 = await testEndpoint(
    'Categories (First Call)',
    'GET',
    '/api/categories'
  );
  results.push(result5);
  console.log(`   Status: ${result5.status}, Time: ${result5.responseTime}ms`);
  
  const result6 = await testEndpoint(
    'Categories (Cached)',
    'GET',
    '/api/categories'
  );
  results.push(result6);
  console.log(`   Status: ${result6.status}, Time: ${result6.responseTime}ms\n`);

  // Summary
  console.log('='.repeat(60));
  console.log('📈 KẾT QUẢ TỔNG HỢP\n');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Thành công: ${successful.length}/${results.length}`);
  console.log(`❌ Thất bại: ${failed.length}/${results.length}\n`);
  
  if (successful.length > 0) {
    const avgTime = successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length;
    const minTime = Math.min(...successful.map(r => r.responseTime));
    const maxTime = Math.max(...successful.map(r => r.responseTime));
    
    console.log('⏱️  Response Time Statistics:');
    console.log(`   Average: ${avgTime.toFixed(2)}ms`);
    console.log(`   Min: ${minTime}ms`);
    console.log(`   Max: ${maxTime}ms\n`);
  }
  
  if (failed.length > 0) {
    console.log('❌ Failed Tests:');
    failed.forEach(r => {
      console.log(`   - ${r.endpoint}: ${r.error}`);
    });
    console.log();
  }
  
  console.log('📝 Lưu ý:');
  console.log('   - Các endpoint cần auth (investments, admin) cần token để test đầy đủ');
  console.log('   - Test với dữ liệu thực để thấy rõ performance improvements');
  console.log('   - Indexes sẽ cải thiện performance khi có nhiều dữ liệu\n');
  
  console.log('🎯 Performance Targets:');
  console.log('   - Investment Rates: < 100ms (cached)');
  console.log('   - Banners: < 100ms (cached)');
  console.log('   - Categories: < 100ms (cached)');
  console.log('   - GET Investments: < 500ms (với indexes)');
  console.log('   - Admin Update: < 300ms (với transaction)');
}

// Run tests
runTests().catch(console.error);

