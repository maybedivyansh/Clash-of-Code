const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY; // Use Service Role key to bypass RLS

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env (ensure SUPABASE_URL and SUPABASE_SECRET_KEY are set)");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function importQuestions() {
  const filePath = path.resolve(__dirname, '../../leetcode-problems/merged_problems.json');
  console.log(`Reading JSON file from ${filePath}...`);
  
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(fileContent);
  const questions = data.questions || [];
  
  console.log(`Found ${questions.length} questions in JSON. Starting import...`);
  
  const batchSize = 100;
  let totalInserted = 0;
  
  for (let i = 0; i < questions.length; i += batchSize) {
    const batch = questions.slice(i, i + batchSize);
    
    const recordsToInsert = batch.map(p => ({
      title: p.title || 'Untitled',
      description: p.description || '',
      starter_code: p.code_snippets?.javascript || '',
      test_cases: p.examples || [],
      difficulty: p.difficulty || 'Medium',
      category: p.topics || [],
      solution: p.solutions || ''
    }));
    
    const { error } = await supabase
      .from('questions')
      .insert(recordsToInsert);
      
    if (error) {
      console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      // Wait a moment and then exit to prevent partial corruption if there's a serious schema error
      process.exit(1);
    }
    
    totalInserted += batch.length;
    console.log(`Successfully inserted batch ${Math.floor(i / batchSize) + 1} (${totalInserted}/${questions.length})`);
  }
  
  console.log('Import complete!');
}

importQuestions().catch(err => {
  console.error("Failed to run import script:", err);
  process.exit(1);
});
