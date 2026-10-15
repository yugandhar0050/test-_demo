import axios from 'axios';

// Keep each tab's account independent while preserving it across page refreshes.
for(const key of ['exam_token','exam_user']){
  const oldValue=localStorage.getItem(key);
  if(!sessionStorage.getItem(key)&&oldValue)sessionStorage.setItem(key,oldValue);
  localStorage.removeItem(key);
}

const api=axios.create({baseURL:import.meta.env.VITE_API_URL||'http://localhost:5000/api',timeout:15000});api.interceptors.request.use(c=>{const t=sessionStorage.getItem('exam_token');if(t)c.headers.Authorization=`Bearer ${t}`;return c});api.interceptors.response.use(r=>r,e=>{if(e.response?.status===401&&e.config?.url?.includes('/auth/me')){sessionStorage.removeItem('exam_token');sessionStorage.removeItem('exam_user')}return Promise.reject(e)});export default api;
