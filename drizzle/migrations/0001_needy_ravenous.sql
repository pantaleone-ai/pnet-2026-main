CREATE TABLE `chatbot_knowledge_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`chatbot_id` text NOT NULL,
	`knowledge_source_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`chatbot_id`) REFERENCES `chatbots`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`knowledge_source_id`) REFERENCES `knowledge_sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chatbot_knowledge_source_unique` ON `chatbot_knowledge_sources` (`chatbot_id`,`knowledge_source_id`);--> statement-breakpoint
CREATE TABLE `chatbot_settings` (
	`chatbot_id` text PRIMARY KEY NOT NULL,
	`model` text,
	`temperature` integer,
	`top_k` integer,
	`context_limit` integer,
	`citation_behavior` text,
	`fallback_message` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`chatbot_id`) REFERENCES `chatbots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `document_chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`chunk_index` integer NOT NULL,
	`text` text NOT NULL,
	`embedding_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`knowledge_source_id` text NOT NULL,
	`name` text NOT NULL,
	`file_type` text,
	`size_bytes` integer,
	`storage_key` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`error` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`knowledge_source_id`) REFERENCES `knowledge_sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `knowledge_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`source_type` text NOT NULL,
	`source_url` text,
	`storage_key` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`page_count` integer DEFAULT 0 NOT NULL,
	`error` text,
	`excluded_paths_json` text DEFAULT '[]' NOT NULL,
	`content_json` text,
	`last_indexed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
