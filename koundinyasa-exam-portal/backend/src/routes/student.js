import {Router} from 'express';
import {query} from '../db.js';
import {requireAuth} from '../middleware/auth.js';

const r=Router();
r.use(requireAuth,(req,res,next)=>req.user?.role==='student'?next():res.status(403).json({error:'Employee access required.'}));

r.get('/roadmap',async(req,res,next)=>{
  try{
    const result=await query(`
      SELECT t.id,t.name,t.description,t.display_order,
        s.id AS module_id,s.name AS module_name,s.created_at AS module_created_at,
        COALESCE(p.is_completed,false) AS is_completed,p.updated_at
      FROM users u
      JOIN topics t ON true
      JOIN subjects s ON s.id=t.subject_id
      LEFT JOIN student_topic_progress p ON p.student_id=u.id AND p.topic_id=t.id
      WHERE u.id=$1
        AND (((s.course_id IS NULL OR s.course_id=u.course_id)
          AND (s.department_id IS NULL OR s.department_id=u.department_id))
          OR EXISTS(SELECT 1 FROM student_assigned_topics a WHERE a.student_id=u.id AND a.topic_id=t.id))
      ORDER BY s.created_at,s.name,t.display_order,t.name`,[req.user.sub]);
    const topics=result.rows;
    const completed=topics.filter(topic=>topic.is_completed).length;
    const total=topics.length;
    res.json({topics,progress:{total,completed,pending:total-completed,percentage:total?Math.round(completed/total*100):0}});
  }catch(e){next(e)}
});

r.patch('/progress/:topicId',async(req,res,next)=>{
  try{
    if(typeof req.body?.is_completed!=='boolean')return res.status(400).json({error:'is_completed must be true or false.'});
    const updated=await query(`
      INSERT INTO student_topic_progress(student_id,topic_id,is_completed,updated_at)
      SELECT u.id,t.id,$3,now()
      FROM users u
      JOIN topics t ON t.id=$2
      JOIN subjects s ON s.id=t.subject_id
      WHERE u.id=$1 AND (((s.course_id IS NULL OR s.course_id=u.course_id)
        AND (s.department_id IS NULL OR s.department_id=u.department_id))
        OR EXISTS(SELECT 1 FROM student_assigned_topics a WHERE a.student_id=u.id AND a.topic_id=t.id))
      ON CONFLICT(student_id,topic_id) DO UPDATE
        SET is_completed=EXCLUDED.is_completed,updated_at=now()
      RETURNING topic_id,is_completed,updated_at`,[req.user.sub,req.params.topicId,req.body.is_completed]);
    if(!updated.rowCount)return res.status(404).json({error:'Roadmap topic not found.'});
    res.json({progress:updated.rows[0]});
  }catch(e){next(e)}
});

export default r;
