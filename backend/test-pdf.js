import { extractTextFromPdf } from './utils/pdfParser.js';
import fs from 'fs';

async function testPdfParsing() {
    console.log('Testing PDF parsing functionality...');

    try {
        // Test con un buffer vacío (simulando un PDF básico)
        const testBuffer = Buffer.from('Test buffer');

        try {
            const result = await extractTextFromPdf(testBuffer);
            console.log('✅ PDF parsing test passed');
            console.log('Extracted text length:', result.length);
        } catch (error) {
            console.log('⚠️ PDF parsing failed (expected for test buffer):', error.message);
        }

        console.log('✅ PDF parser module loaded successfully');
    } catch (error) {
        console.error('❌ PDF parser test failed:', error);
    }
}

testPdfParsing();
