import {PrismaClient} from "@prisma/client"; import bcrypt from "bcryptjs";
const p=new PrismaClient();
async function main(){
 const passwordHash=await bcrypt.hash("Password123!",10);
 const user=await p.user.upsert({where:{email:"demo@learnsphere.dev"},update:{},create:{name:"Demo Student",email:"demo@learnsphere.dev",passwordHash}});
 const course=await p.course.create({data:{title:"Full-Stack TypeScript",description:"Build scalable React, Node.js, Express and PostgreSQL applications.",difficulty:"Intermediate",category:"Web Development",lessons:{create:[
  {title:"TypeScript Fundamentals",content:"Types, interfaces, generics and safe API contracts.",order:1},
  {title:"REST APIs with Express",content:"Routing, validation, middleware and error handling.",order:2},
  {title:"PostgreSQL Optimization",content:"Joins, indexes, migrations and query design.",order:3}
 ]}});
 const assessment=await p.assessment.create({data:{courseId:course.id,title:"Full-Stack Fundamentals",duration:15,totalMarks:3,questions:{create:[
  {question:"Which HTTP method is normally used to create a resource?",options:["GET","POST","DELETE","PATCH"],correctAnswer:1},
  {question:"Which database is relational?",options:["MongoDB","Redis","PostgreSQL","DynamoDB"],correctAnswer:2},
  {question:"What does a PostgreSQL index primarily improve?",options:["Query lookup speed","Image quality","CSS rendering","Password hashing"],correctAnswer:0}
 ]}}});
 await p.enrollment.create({data:{userId:user.id,courseId:course.id}});
 await p.progress.create({data:{userId:user.id,courseId:course.id,percent:62}});
 console.log("Seeded",course.id,assessment.id);
}
main().finally(()=>p.$disconnect());
