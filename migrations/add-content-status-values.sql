-- Add new content status values: reviewed and archived
-- These are added to support the content lifecycle: draft → reviewed → published → archived

DO $$
BEGIN
    -- Add 'reviewed' status if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'reviewed' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'content_status')
    ) THEN
        ALTER TYPE content_status ADD VALUE 'reviewed' AFTER 'in_review';
    END IF;
    
    -- Add 'archived' status if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'archived' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'content_status')
    ) THEN
        ALTER TYPE content_status ADD VALUE 'archived' AFTER 'published';
    END IF;
END $$;
