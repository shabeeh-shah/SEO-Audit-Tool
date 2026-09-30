import {integer,sqliteTable,text} from 'drizzle-orm/sqlite-core';

export const sharedReports=sqliteTable('shared_reports',{
 id:text('id').primaryKey(),
 auditJson:text('audit_json').notNull(),
 createdAt:integer('created_at').notNull(),
});
