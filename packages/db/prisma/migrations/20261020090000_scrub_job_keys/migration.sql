-- Job payloads used to carry the creator's model key in plain text. New jobs carry it sealed
-- and drop it on completion; this strips every key already stored.
UPDATE "GenerationJob"
SET payload = payload - 'userModel' - 'userApiKey'
WHERE payload ? 'userModel' OR payload ? 'userApiKey';
