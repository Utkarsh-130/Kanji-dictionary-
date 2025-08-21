
CREATE TABLE IF NOT EXISTS studied_kanji (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  kanji TEXT NOT NULL,
  meaning TEXT,
  reading TEXT,
  level TEXT,
  studied_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Prevent duplicate entries for same user and kanji
  UNIQUE(user_id, kanji)
);

-- Enable Row Level Security on studied_kanji
ALTER TABLE studied_kanji ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for studied_kanji
CREATE POLICY "Users can view their own studied kanji" 
ON studied_kanji FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own studied kanji" 
ON studied_kanji FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own studied kanji" 
ON studied_kanji FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own studied kanji" 
ON studied_kanji FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_studied_kanji_user_id ON studied_kanji(user_id);
CREATE INDEX IF NOT EXISTS idx_studied_kanji_studied_at ON studied_kanji(studied_at);
CREATE INDEX IF NOT EXISTS idx_studied_kanji_user_date ON studied_kanji(user_id, studied_at);
CREATE INDEX IF NOT EXISTS idx_studied_kanji_level ON studied_kanji(level);

-- Create function to automatically sync studied kanji to card_reviews
-- This will help integrate browser extension data with mobile app spaced repetition
CREATE OR REPLACE FUNCTION sync_studied_kanji_to_reviews()
RETURNS TRIGGER AS $$
BEGIN
  -- When a kanji is marked as studied in browser extension,
  -- create or update corresponding card_review entry for mobile app
  INSERT INTO card_reviews (
    user_id,
    kanji,
    ease_factor,
    interval,
    repetitions,
    next_review,
    created_at,
    updated_at
  )
  VALUES (
    NEW.user_id,
    NEW.kanji,
    2.5,  -- Default ease factor
    1,    -- Start with 1 day interval
    0,    -- No repetitions yet
    CURRENT_DATE,  -- Due today
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, kanji) DO UPDATE SET
    updated_at = NOW()
  WHERE card_reviews.repetitions = 0;  -- Only update if not yet studied in mobile app
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER sync_studied_kanji_trigger
  AFTER INSERT ON studied_kanji
  FOR EACH ROW
  EXECUTE FUNCTION sync_studied_kanji_to_reviews();

-- Create view for extension dashboard statistics
CREATE OR REPLACE VIEW extension_user_stats AS
SELECT 
  user_id,
  COUNT(*) as total_studied,
  COUNT(CASE WHEN studied_at >= CURRENT_DATE THEN 1 END) as studied_today,
  COUNT(CASE WHEN studied_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as studied_this_week,
  COUNT(CASE WHEN level = 'N5' THEN 1 END) as n5_count,
  COUNT(CASE WHEN level = 'N4' THEN 1 END) as n4_count,
  COUNT(CASE WHEN level = 'N3' THEN 1 END) as n3_count,
  COUNT(CASE WHEN level = 'N2' THEN 1 END) as n2_count,
  COUNT(CASE WHEN level = 'N1' THEN 1 END) as n1_count
FROM studied_kanji
GROUP BY user_id;

ALTER VIEW extension_user_stats SET (security_invoker = on);

CREATE POLICY "Users can view their own extension stats" 
ON extension_user_stats FOR SELECT 
USING (auth.uid() = user_id);

-- Sample data insertion function for testing (optional)
CREATE OR REPLACE FUNCTION insert_sample_studied_kanji(sample_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO studied_kanji (user_id, kanji, meaning, reading, level) VALUES
  (sample_user_id, '学', 'study, learning', 'ガク / まな.ぶ', 'N5'),
  (sample_user_id, '生', 'life, birth', 'セイ / い.きる', 'N5'),
  (sample_user_id, '先', 'before, ahead', 'セン / さき', 'N5'),
  (sample_user_id, '日', 'day, sun', 'ニチ / ひ', 'N5'),
  (sample_user_id, '本', 'book, main', 'ホン / もと', 'N5')
  ON CONFLICT (user_id, kanji) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
