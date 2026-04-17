const { parseStringPromise } = require('xml2js');
const fs = require('fs');

async function testParse() {
  try {
    // อ่านไฟล์ XML ของ SOGNSTMP
    const xmlContent = fs.readFileSync('test_sognstmp.xml', 'utf8');
    const result = await parseStringPromise(xmlContent, { explicitArray: false });
    
    console.log('=== SOGNSTMP XML Structure ===');
    console.log('Root keys:', Object.keys(result));
    
    // ตรวจสอบโครงสร้างต่างๆ ที่เป็นไปได้
    if (result.STMSTMP) {
      console.log('\n=== STMSTMP Structure ===');
      console.log('STMSTMP keys:', Object.keys(result.STMSTMP));
      
      if (result.STMSTMP.TBills) {
        console.log('\n=== TBills Structure ===');
        console.log('TBills keys:', Object.keys(result.STMSTMP.TBills));
        
        if (result.STMSTMP.TBills.ST) {
          console.log('\n=== ST Structure ===');
          console.log('ST keys:', Object.keys(result.STMSTMP.TBills.ST));
          
          if (result.STMSTMP.TBills.ST.HG) {
            console.log('\n=== HG Structure ===');
            const HG = result.STMSTMP.TBills.ST.HG;
            console.log('HG type:', typeof HG);
            console.log('HG keys:', Object.keys(HG));
            
            if (HG.TBill) {
              console.log('\n=== TBill Structure ===');
              const tbills = Array.isArray(HG.TBill) ? HG.TBill : [HG.TBill];
              console.log('TBill count:', tbills.length);
              console.log('First TBill:', JSON.stringify(tbills[0], null, 2));
            }
          }
        }
      }
    }
    
    // ตรวจสอบโครงสร้างอื่นๆ ที่เป็นไปได้
    if (result.STMLIST) {
      console.log('\n=== STMLIST Structure ===');
      console.log('STMLIST keys:', Object.keys(result.STMLIST));
    }
    
    if (result.STMSTMM) {
      console.log('\n=== STMSTMM Structure ===');
      console.log('STMSTMM keys:', Object.keys(result.STMSTMM));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testParse(); 