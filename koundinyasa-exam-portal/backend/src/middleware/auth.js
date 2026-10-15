import jwt from 'jsonwebtoken';
export function requireAuth(req,res,next){const t=req.headers.authorization?.startsWith('Bearer ')?req.headers.authorization.slice(7):null;if(!t)return res.status(401).json({error:'Authentication required.'});try{req.user=jwt.verify(t,process.env.JWT_SECRET);next()}catch{return res.status(401).json({error:'Session expired. Sign in again.'})}}
export function requireAdmin(req,res,next){if(req.user?.role!=='admin')return res.status(403).json({error:'Administrator access required.'});next()}
