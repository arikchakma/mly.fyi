CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text(255) NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`is_enabled` integer DEFAULT true NOT NULL,
	`auth_provider` text NOT NULL,
	`verification_code` text,
	`reset_password_code` text,
	`reset_password_code_at` integer,
	`verified_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `email_log_events` (
	`id` text PRIMARY KEY NOT NULL,
	`email_log_id` text NOT NULL,
	`email` text NOT NULL,
	`type` text NOT NULL,
	`raw_response` text,
	`user_agent` text,
	`ip_address` text,
	`link` text,
	`timestamp` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`email_log_id`) REFERENCES `email_logs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `email_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text,
	`project_id` text NOT NULL,
	`api_key_id` text NOT NULL,
	`from` text NOT NULL,
	`to` text NOT NULL,
	`reply_to` text,
	`subject` text NOT NULL,
	`text` text,
	`html` text,
	`status` text NOT NULL,
	`send_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`api_key_id`) REFERENCES `project_api_keys`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `project_api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`project_id` text NOT NULL,
	`creator_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`key` text NOT NULL,
	`usage_count` integer DEFAULT 0,
	`last_used_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `project_identities` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`creator_id` text NOT NULL,
	`type` text NOT NULL,
	`email` text,
	`domain` text,
	`mail_from_domain` text,
	`status` text DEFAULT 'not-started' NOT NULL,
	`records` text DEFAULT '[]',
	`click_tracking` integer DEFAULT false NOT NULL,
	`open_tracking` integer DEFAULT false NOT NULL,
	`configuration_set_name` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `project_members` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`invited_email` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`status` text DEFAULT 'invited' NOT NULL,
	`last_resend_invite_at` integer,
	`resend_invite_count` integer DEFAULT 0,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`creator_id` text NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`timezone` text NOT NULL,
	`access_key_id` text,
	`secret_access_key` text,
	`region` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_id_unique` ON `users` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_verification_code_unique` ON `users` (`verification_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_reset_password_code_unique` ON `users` (`reset_password_code`);--> statement-breakpoint
CREATE INDEX `email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `email_log_events_id_unique` ON `email_log_events` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `email_logs_id_unique` ON `email_logs` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_api_keys_id_unique` ON `project_api_keys` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_api_keys_key_unique` ON `project_api_keys` (`key`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_identities_id_unique` ON `project_identities` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_members_id_unique` ON `project_members` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `projects_id_unique` ON `projects` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `projects_access_key_id_unique` ON `projects` (`access_key_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `projects_secret_access_key_unique` ON `projects` (`secret_access_key`);