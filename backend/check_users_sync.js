require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

async function checkDiscrepancy() {
    console.log("--- USER DISCREPANCY CHECK ---");
    
    try {
        // 1. Get Prisma Users
        const prismaUsers = await prisma.user.findMany({
            select: { email: true, id: true, role: true }
        });
        console.log(`Prisma Users Count: ${prismaUsers.length}`);
        
        // 2. Get Supabase Users (This requires Service Role Key for full list, but we'll try)
        // Note: Without Service Role, we might only see the currently logged in if we use the same client, 
        // but since we are backend, we usually need Service Role to list all.
        
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.warn("WARNING: SUPABASE_SERVICE_ROLE_KEY is missing. Cannot list all Supabase users via API.");
            console.log("Emails in Prisma:");
            prismaUsers.forEach(u => console.log(`- ${u.email} (ID: ${u.id}, Role: ${u.role})`));
            return;
        }

        const { data: { users }, error } = await supabase.auth.admin.listUsers();
        
        if (error) {
            console.error("Error listing Supabase users:", error.message);
            return;
        }
        
        console.log(`Supabase Users Count: ${users.length}`);
        
        const sbEmails = users.map(u => u.email.toLowerCase());
        const prismaEmails = prismaUsers.map(u => u.email.toLowerCase());
        
        console.log("\nUsers in Prisma but NOT in Supabase:");
        prismaUsers.filter(u => !sbEmails.includes(u.email.toLowerCase())).forEach(u => console.log(`- ${u.email}`));
        
        console.log("\nUsers in Supabase but NOT in Prisma:");
        users.filter(u => !prismaEmails.includes(u.email.toLowerCase())).forEach(u => console.log(`- ${u.email}`));
        
    } catch (error) {
        console.error("Diagnostic Failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

checkDiscrepancy();
