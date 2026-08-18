import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { createServer } from "http";
import { Server } from "socket.io";

const prisma = new PrismaClient();
const app = express();
const http = createServer(app);
const io = new Server(http,{cors:{origin:"*"}});
app.use(cors()); app.use(express.json());
const SECRET=process.env.JWT_SECRET||"dev-secret";

function auth(req:any,res:any,next:any){
  const token=req.headers.authorization?.replace("Bearer ","");
  if(!token) return res.status(401).json({message:"Authentication required"});
  try { req.user=jwt.verify(token,SECRET); next(); } catch { res.status(401).json({message:"Invalid token"}); }
}
app.get("/api/health",(_,res)=>res.json({status:"ok",service:"learnsphere-api"}));

app.post("/api/auth/register",async(req,res)=>{
  const parsed=z.object({name:z.string().min(2),email:z.string().email(),password:z.string().min(8)}).safeParse(req.body);
  if(!parsed.success) return res.status(400).json({message:"Invalid registration data"});
  const {name,email,password}=parsed.data;
  if(await prisma.user.findUnique({where:{email}})) return res.status(409).json({message:"Email already registered"});
  const user=await prisma.user.create({data:{name,email,passwordHash:await bcrypt.hash(password,10)}});
  const token=jwt.sign({id:user.id,name:user.name,email:user.email,role:user.role},SECRET,{expiresIn:"7d"});
  res.status(201).json({token,user:{id:user.id,name:user.name,email:user.email}});
});
app.post("/api/auth/login",async(req,res)=>{
  const parsed=z.object({email:z.string().email(),password:z.string()}).safeParse(req.body);
  if(!parsed.success) return res.status(400).json({message:"Invalid credentials"});
  const user=await prisma.user.findUnique({where:{email:parsed.data.email}});
  if(!user || !(await bcrypt.compare(parsed.data.password,user.passwordHash))) return res.status(401).json({message:"Invalid email or password"});
  const token=jwt.sign({id:user.id,name:user.name,email:user.email,role:user.role},SECRET,{expiresIn:"7d"});
  res.json({token,user:{id:user.id,name:user.name,email:user.email,role:user.role}});
});
app.get("/api/courses",async(_,res)=>res.json(await prisma.course.findMany({include:{lessons:true,assessments:true},orderBy:{createdAt:"desc"}})));

app.get("/api/dashboard",auth,async(req:any,res)=>{
  const user=await prisma.user.findUnique({where:{id:req.user.id},include:{progress:{include:{course:true}},submissions:{include:{assessment:true},orderBy:{submittedAt:"desc"},take:5},notifications:{orderBy:{createdAt:"desc"},take:5}}});
  if(!user) return res.status(404).json({message:"User not found"});
  const avg=user.submissions.length?user.submissions.reduce((a,s)=>a+s.percentage,0)/user.submissions.length:0;
  res.json({user:{name:user.name,email:user.email},progress:user.progress,submissions:user.submissions,notifications:user.notifications,stats:{assessments:user.submissions.length,average:Math.round(avg),courses:user.progress.length}});
});
app.get("/api/assessments/:id",auth,async(req,res)=>{
  const a=await prisma.assessment.findUnique({where:{id:req.params.id},include:{questions:true,course:true}});
  if(!a) return res.status(404).json({message:"Assessment not found"});
  res.json(a);
});
app.post("/api/assessments/:id/submit",auth,async(req:any,res)=>{
  const body=z.object({answers:z.array(z.number())}).safeParse(req.body);
  if(!body.success) return res.status(400).json({message:"Answers must be an array"});
  const a=await prisma.assessment.findUnique({where:{id:req.params.id},include:{questions:true}});
  if(!a) return res.status(404).json({message:"Assessment not found"});
  let score=0; a.questions.forEach((q,i)=>{if(body.data.answers[i]===q.correctAnswer) score+=q.marks});
  const total=a.questions.reduce((s,q)=>s+q.marks,0)||1;
  const percentage=score/total*100;
  const submission=await prisma.submission.create({data:{userId:req.user.id,assessmentId:a.id,score,percentage}});
  await prisma.notification.create({data:{userId:req.user.id,message:`Assessment submitted. Score: ${Math.round(percentage)}%`}});
  io.to(req.user.id).emit("notification",{message:`Assessment submitted. Score: ${Math.round(percentage)}%`});
  res.json({score,percentage,submissionId:submission.id});
});
app.post("/api/progress",auth,async(req:any,res)=>{
  const body=z.object({courseId:z.string(),percent:z.number().min(0).max(100)}).parse(req.body);
  res.json(await prisma.progress.upsert({where:{userId_courseId:{userId:req.user.id,courseId:body.courseId}},update:{percent:body.percent},create:{...body,userId:req.user.id}}));
});
app.post("/api/webhooks/assessment",async(req,res)=>res.json({received:true,event:req.body?.event||"unknown"}));
io.on("connection",socket=>{socket.on("join",(userId:string)=>socket.join(userId));});
http.listen(Number(process.env.PORT)||5000,()=>console.log("LearnSphere API running on port 5000"));
