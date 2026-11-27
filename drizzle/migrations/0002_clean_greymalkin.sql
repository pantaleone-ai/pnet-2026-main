CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`chatbot_id` text NOT NULL,
	`visitor_id` text NOT NULL,
	`title` text,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`chatbot_id`) REFERENCES `chatbots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conversation_visitor_unique` ON `conversations` (`chatbot_id`,`visitor_id`);--> statement-breakpoint
CREATE TABLE `embed_domains` (
	`id` text PRIMARY KEY NOT NULL,
	`chatbot_id` text NOT NULL,
	`domain` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`chatbot_id`) REFERENCES `chatbots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `embed_domain_unique` ON `embed_domains` (`chatbot_id`,`domain`);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`chatbot_id` text NOT NULL,
	`conversation_id` text,
	`name` text,
	`email` text,
	`company` text,
	`inquiry` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`chatbot_id`) REFERENCES `chatbots`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`citations_json` text,
	`tokens_json` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `usage_events` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`chatbot_id` text,
	`conversation_id` text,
	`event_type` text NOT NULL,
	`model` text,
	`input_chars` integer,
	`output_chars` integer,
	`metadata_json` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`chatbot_id`) REFERENCES `chatbots`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
ALTER TABLE `chatbot_settings` ADD `tone` text;--> statement-breakpoint
ALTER TABLE `chatbot_settings` ADD `system_instructions` text;--> statement-breakpoint
ALTER TABLE `chatbot_settings` ADD `suggested_questions_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `chatbots` ADD `welcome_message` text;--> statement-breakpoint
ALTER TABLE `chatbots` ADD `lead_capture_mode` text DEFAULT 'contact' NOT NULL;--> statement-breakpoint
ALTER TABLE `chatbots` ADD `appearance_json` text DEFAULT '{}' NOT NULL;