require("dotenv").config();
const express=require("express"),path=require("path"),fs=require("fs"),crypto=require("crypto");
const Database=require("better-sqlite3"),bcrypt=require("bcryptjs"),multer=require("multer"),cookieSession=require("cookie-session");
const app=express(); const PORT=+process.env.PORT||3000; const ROOT=__dirname; const STORAGE=process.env.STORAGE_PATH||path.join(ROOT,"data"); const DATA=STORAGE; const UPLOADS=path.join(STORAGE,"uploads"); fs.mkdirSync(DATA,{recursive:true}); fs.mkdirSync(UPLOADS,{recursive:true});
fs.mkdirSync(DATA,{recursive:true});fs.mkdirSync(UPLOADS,{recursive:true});
const db=new Database(path.join(DATA,"weazel.db"));db.pragma("journal_mode=WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL,bio TEXT DEFAULT '',avatar TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS articles(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,content TEXT NOT NULL,excerpt TEXT DEFAULT '',category TEXT NOT NULL,image TEXT,author_id INTEGER NOT NULL,published INTEGER DEFAULT 1,breaking INTEGER DEFAULT 0,discord_sent INTEGER DEFAULT 0,discord_error TEXT,views INTEGER DEFAULT 0,created_at TEXT DEFAULT CURRENT_TIMESTAMP,updated_at TEXT DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(author_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS comments(id INTEGER PRIMARY KEY AUTOINCREMENT,article_id INTEGER NOT NULL,name TEXT NOT NULL,content TEXT NOT NULL,approved INTEGER DEFAULT 1,created_at TEXT DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS reactions(id INTEGER PRIMARY KEY AUTOINCREMENT,article_id INTEGER NOT NULL,reaction TEXT NOT NULL,visitor TEXT NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP,UNIQUE(article_id,reaction,visitor));
CREATE TABLE IF NOT EXISTS citizen_posts(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,title TEXT NOT NULL,content TEXT NOT NULL,category TEXT NOT NULL DEFAULT 'Citoyen',image TEXT,status TEXT NOT NULL DEFAULT 'pending',review_note TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,reviewed_at TEXT,FOREIGN KEY(user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,description TEXT NOT NULL,date TEXT NOT NULL,time TEXT,location TEXT,image TEXT,created_by INTEGER,created_at TEXT DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(created_by) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS gallery(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,image TEXT NOT NULL,caption TEXT DEFAULT '',author_id INTEGER,created_at TEXT DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(author_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS jobs(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,company TEXT NOT NULL,type TEXT NOT NULL,description TEXT NOT NULL,contact TEXT,image TEXT,active INTEGER DEFAULT 1,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS contacts(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,name TEXT NOT NULL,email TEXT,subject TEXT NOT NULL,message TEXT NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
`);
function seed(){const email=(process.env.ADMIN_EMAIL||"admin@weazel.local").toLowerCase(),pw=process.env.ADMIN_PASSWORD||"ChangeMe123!";let a=db.prepare("SELECT id FROM users WHERE email=?").get(email);if(!a){db.prepare("INSERT INTO users(name,email,password_hash,role,bio) VALUES(?,?,?,'admin',?)").run("Administrateur Weazel",email,bcrypt.hashSync(pw,12),"Administration de la rÃ©daction Weazel News.");a=db.prepare("SELECT id FROM users WHERE email=?").get(email)}if(!db.prepare("SELECT COUNT(*) c FROM articles").get().c)db.prepare("INSERT INTO articles(title,content,excerpt,category,author_id) VALUES(?,?,?,?,?)").run("Bienvenue sur le nouveau Weazel News","Bienvenue sur le portail RP du Weazel News. Les citoyens peuvent dÃ©sormais crÃ©er leur compte, proposer des annonces et suivre les Ã©vÃ©nements de la ville.","Le nouveau portail citoyen est ouvert.","ActualitÃ©s",a.id);if(!db.prepare("SELECT COUNT(*) c FROM jobs").get().c){let s=db.prepare("INSERT INTO jobs(title,company,type,description,contact) VALUES(?,?,?,?,?)");[["Agent immobilier","Dynasty 8","IndÃ©pendant","Accompagner les habitants dans leurs projets immobiliers.","Dynasty 8"],["Vendeur","Pawnshop","IndÃ©pendant","Rejoignez l'Ã©quipe du commerce.","Pawnshop"],["MÃ©decin / EMS","Pillbox Hospital","Service public","Le service mÃ©dical recrute.","Pillbox Hospital"],["Policier","Station 13 â€” LSPD","Service public","La police recrute de nouveaux agents.","Station 13"]].forEach(x=>s.run(...x))}}try{db.prepare("ALTER TABLE jobs ADD COLUMN discord TEXT").run();console.log("Colonne Discord ajoutee aux emplois.")}catch(e){if(!e.message.includes("duplicate column"))throw e}
try{db.prepare("ALTER TABLE gallery ADD COLUMN youtube TEXT DEFAULT ''").run();console.log("Colonne YouTube ajoutee a la galerie.")}catch(e){if(!e.message.includes("duplicate column"))throw e}
db.prepare("CREATE TABLE IF NOT EXISTS videos(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,youtube TEXT NOT NULL,caption TEXT DEFAULT '',author_id INTEGER,created_at TEXT DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(author_id) REFERENCES users(id))").run();
seed();
app.set("trust proxy", 1); app.use(express.json({limit:"3mb"}));app.use(express.urlencoded({extended:true}));
app.use(cookieSession({name:"weazel",keys:[process.env.SESSION_SECRET||"CHANGE_ME"],httpOnly:true,sameSite:process.env.NODE_ENV==="production"?"none":"lax",secure:process.env.NODE_ENV==="production",maxAge:43200000}));
app.use("/uploads",express.static(UPLOADS));app.use(express.static(path.join(ROOT,"public")));
const storage=multer.diskStorage({destination:(_,__,cb)=>cb(null,UPLOADS),filename:(_,f,cb)=>cb(null,Date.now()+"-"+crypto.randomBytes(5).toString("hex")+path.extname(f.originalname).toLowerCase())});
const upload=multer({storage,limits:{fileSize:10*1024*1024},fileFilter:(_,f,cb)=>{console.log("MULTER FILE:",f.originalname,f.mimetype);cb(null,true)}});
const getUser=id=>db.prepare("SELECT * FROM users WHERE id=?").get(id),pub=u=>({id:u.id,name:u.name,email:u.email,role:u.role,bio:u.bio||"",avatar:u.avatar||null,created_at:u.created_at||null});
const auth=(req,res,next)=>req.session?.userId?next():res.status(401).json({error:"Connexion requise."});
const staff=(req,res,next)=>!req.session?.userId?res.status(401).json({error:"Connexion requise."}):["admin","journaliste"].includes(req.session.role)?next():res.status(403).json({error:"AccÃ¨s rÃ©daction requis."});
const admin=(req,res,next)=>!req.session?.userId?res.status(401).json({error:"Connexion requise."}):req.session.role==="admin"?next():res.status(403).json({error:"AccÃ¨s admin requis."});
function art(id){return db.prepare("SELECT a.*,u.name author,u.avatar author_avatar FROM articles a JOIN users u ON u.id=a.author_id WHERE a.id=?").get(id)}
async function discord(payload,breaking=false){const wh=breaking?(process.env.DISCORD_BREAKING_WEBHOOK_URL||process.env.DISCORD_WEBHOOK_URL):process.env.DISCORD_WEBHOOK_URL;if(!wh)return{ok:false,error:"Webhook Discord non configurÃ©."};try{let r=await fetch(wh,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});return r.ok?{ok:true}:{ok:false,error:"Discord HTTP "+r.status}}catch(e){return{ok:false,error:e.message}}}
async function notifyArticle(a){let e={title:(a.breaking?"ðŸš¨ BREAKING NEWS â€” ":"ðŸ“° ")+a.title,description:a.content.slice(0,3800),color:a.breaking?16711680:13369359,fields:[{name:"CatÃ©gorie",value:a.category,inline:true},{name:"Journaliste",value:a.author,inline:true}],footer:{text:"Weazel News â€¢ vizu rp"},timestamp:new Date().toISOString()};if(a.image)e.image={url:(process.env.PUBLIC_URL||"")+a.image};return discord({username:"Weazel News",embeds:[e]},!!a.breaking)}
app.get("/api/me",(req,res)=>res.json({user:req.session?.userId?pub(getUser(req.session.userId)):null}));
app.post("/api/register",(req,res)=>{let{name,email,password}=req.body;if(!name||!email||!password||password.length<6)return res.status(400).json({error:"Nom, email et mot de passe (6 caractÃ¨res minimum) requis."});try{let r=db.prepare("INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,'citoyen')").run(String(name).trim().slice(0,60),String(email).trim().toLowerCase(),bcrypt.hashSync(String(password),12));req.session.userId=r.lastInsertRowid;req.session.role="citoyen";res.json({user:pub(getUser(r.lastInsertRowid))})}catch(e){res.status(400).json({error:"Cette adresse email est dÃ©jÃ Â  utilisÃ©e."})}});
app.post("/api/login",(req,res)=>{let x=db.prepare("SELECT * FROM users WHERE email=?").get(String(req.body.email||"").trim().toLowerCase());if(!x||!bcrypt.compareSync(String(req.body.password||""),x.password_hash))return res.status(401).json({error:"Identifiants incorrects."});req.session.userId=x.id;req.session.role=x.role;res.json({user:pub(x)})});
app.post("/api/logout",(req,res)=>{req.session=null;res.json({ok:true})});app.put("/api/account",auth,(req,res)=>{
    let{name,email,bio}=req.body;

    name=String(name||"").trim().slice(0,60);
    email=String(email||"").trim().toLowerCase();
    bio=String(bio||"").trim().slice(0,500);

    if(!name||!email){
        return res.status(400).json({
            error:"Le nom et l'adresse e-mail sont obligatoires."
        });
    }

    try{
        db.prepare(`
            UPDATE users
            SET name=?,email=?,bio=?
            WHERE id=?
        `).run(
            name,
            email,
            bio,
            req.session.userId
        );

        res.json({
            ok:true,
            user:pub(getUser(req.session.userId))
        });

    }catch(e){
        if(String(e.message).includes("UNIQUE")){
            return res.status(400).json({
                error:"Cette adresse email est déjà utilisée."
            });
        }

        console.error(e);

        res.status(500).json({
            error:"Impossible d'enregistrer les modifications."
        });
    }
});


app.put("/api/account/password",auth,(req,res)=>{
    const password=String(req.body.password||"");

    if(password.length<6){
        return res.status(400).json({
            error:"Le mot de passe doit contenir au minimum 6 caractères."
        });
    }

    try{
        const hash=bcrypt.hashSync(password,12);

        db.prepare(`
            UPDATE users
            SET password_hash=?
            WHERE id=?
        `).run(
            hash,
            req.session.userId
        );

        res.json({
            ok:true
        });

    }catch(e){

        console.error(e);

        res.status(500).json({
            error:"Impossible de modifier le mot de passe."
        });
    }
});
app.get("/api/articles",(req,res)=>{let q=String(req.query.q||""),cat=String(req.query.category||"");let sql="SELECT a.*,u.name author FROM articles a JOIN users u ON u.id=a.author_id WHERE a.published=1",p=[];if(q){sql+=" AND(a.title LIKE ? OR a.content LIKE ?)";p.push("%"+q+"%","%"+q+"%")}if(cat){sql+=" AND a.category=?";p.push(cat)}sql+=" ORDER BY a.breaking DESC,datetime(a.created_at) DESC";res.json(db.prepare(sql).all(...p))});
app.get("/api/breaking",(req,res)=>res.json(db.prepare("SELECT a.id,a.title,a.excerpt,a.image,u.name author FROM articles a JOIN users u ON u.id=a.author_id WHERE a.published=1 AND a.breaking=1 ORDER BY datetime(a.created_at) DESC LIMIT 6").all()));
app.get("/api/articles/:id",(req,res)=>{let a=art(req.params.id);if(!a||!a.published)return res.status(404).json({error:"Article introuvable."});db.prepare("UPDATE articles SET views=views+1 WHERE id=?").run(a.id);a.views++;a.comments=db.prepare("SELECT id,name,content,created_at FROM comments WHERE article_id=? AND approved=1 ORDER BY datetime(created_at) DESC").all(a.id);a.reactions=db.prepare("SELECT reaction,COUNT(*) count FROM reactions WHERE article_id=? GROUP BY reaction").all(a.id);res.json(a)});
app.post("/api/articles/:id/comments",auth,(req,res)=>{let content=String(req.body.content||"").trim().slice(0,1200),name=getUser(req.session.userId).name;if(!content)return res.status(400).json({error:"Commentaire vide."});db.prepare("INSERT INTO comments(article_id,name,content) VALUES(?,?,?)").run(req.params.id,name,content);res.json({ok:true})});
app.post("/api/articles/:id/reactions",auth,(req,res)=>{let r=String(req.body.reaction||"");let allowed=["like","heart","laugh","wow","angry"];if(!allowed.includes(r))return res.status(400).json({error:"Réaction invalide."});try{db.prepare("INSERT INTO reactions(article_id,reaction,visitor) VALUES(?,?,?)").run(req.params.id,r,String(req.session.userId))}catch(e){}res.json({ok:true})});
app.get("/api/jobs",(req,res)=>{
    try {
        const jobs = db.prepare(`
            SELECT *
            FROM jobs
            WHERE active=1
            ORDER BY datetime(created_at) DESC
        `).all();

        res.json(jobs);

    } catch(error) {

        console.error("GET /api/jobs :", error);

        res.status(500).json({
            error: "Impossible de charger les offres."
        });
    }
});


app.get("/api/admin/jobs",staff,(req,res)=>{
    try {

        const jobs = db.prepare(`
            SELECT *
            FROM jobs
            ORDER BY active DESC, datetime(created_at) DESC
        `).all();

        res.json(jobs);

    } catch(error) {

        console.error("GET /api/admin/jobs :", error);

        res.status(500).json({
            error: "Impossible de charger les offres."
        });
    }
});


app.post("/api/admin/jobs",staff,(req,res)=>{

    try {

        const {
            title,
            company,
            type,
            description,
            contact,
            image,
            discord,
            active
        } = req.body;


        if (!title || !company || !type || !description) {

            return res.status(400).json({
                error: "Poste, entreprise, type et description requis."
            });
        }


        const result = db.prepare(`
            INSERT INTO jobs
            (
                title,
                company,
                type,
                description,
                contact,
                image,
                discord,
                active
            )
            VALUES (?,?,?,?,?,?,?,?)
        `).run(
            title.trim(),
            company.trim(),
            type.trim(),
            description.trim(),
            contact ? contact.trim() : "",
            image || null,
            discord ? discord.trim() : "",
            active === false ? 0 : 1
        );


        res.json({
            ok: true,
            id: result.lastInsertRowid
        });

    } catch(error) {

        console.error("POST /api/admin/jobs :", error);

        res.status(500).json({
            error: error.message
        });
    }
});


app.put("/api/admin/jobs/:id",staff,(req,res)=>{

    try {

        const {
            title,
            company,
            type,
            description,
            contact,
            image,
            discord,
            active
        } = req.body;


        if (!title || !company || !type || !description) {

            return res.status(400).json({
                error: "Poste, entreprise, type et description requis."
            });
        }


        const result = db.prepare(`
            UPDATE jobs
            SET
                title=?,
                company=?,
                type=?,
                description=?,
                contact=?,
                image=?,
                discord=?,
                active=?
            WHERE id=?
        `).run(
            title.trim(),
            company.trim(),
            type.trim(),
            description.trim(),
            contact ? contact.trim() : "",
            image || null,
            discord ? discord.trim() : "",
            active ? 1 : 0,
            req.params.id
        );


        res.json({
            ok: result.changes > 0
        });

    } catch(error) {

        console.error("PUT /api/admin/jobs :", error);

        res.status(500).json({
            error: error.message
        });
    }
});


app.delete("/api/admin/jobs/:id",staff,(req,res)=>{

    try {

        const result = db.prepare(
            "DELETE FROM jobs WHERE id=?"
        ).run(req.params.id);


        res.json({
            ok: result.changes > 0
        });

    } catch(error) {

        console.error("DELETE /api/admin/jobs :", error);

        res.status(500).json({
            error: error.message
        });
    }
});


app.get("/api/events",(req,res)=>res.json(db.prepare("SELECT e.*,u.name creator FROM events e LEFT JOIN users u ON u.id=e.created_by WHERE e.date>=date('now') ORDER BY e.date,e.time LIMIT 50").all()));
app.get("/api/gallery",(req,res)=>res.json(db.prepare("SELECT g.*,u.name author FROM gallery g LEFT JOIN users u ON u.id=g.author_id ORDER BY datetime(g.created_at) DESC LIMIT 60").all()));
app.get("/api/journalists",(req,res)=>res.json(db.prepare("SELECT id,name,bio,avatar,role FROM users WHERE role IN('journaliste','admin') ORDER BY name").all()));
app.post("/api/contact",auth,(req,res)=>{let{name,email,subject,message}=req.body;if(!subject||!message)return res.status(400).json({error:"Sujet et message obligatoires."});db.prepare("INSERT INTO contacts(user_id,name,email,subject,message) VALUES(?,?,?,?,?)").run(req.session.userId,getUser(req.session.userId).name,email||getUser(req.session.userId).email,subject,message);res.json({ok:true})});
app.post("/api/citizen-posts",auth,(req,res)=>{let{title,content,category,image}=req.body;if(!title||!content)return res.status(400).json({error:"Titre et contenu obligatoires."});let r=db.prepare("INSERT INTO citizen_posts(user_id,title,content,category,image) VALUES(?,?,?,?,?)").run(req.session.userId,title,content,category||"Citoyen",image||null);res.json({id:r.lastInsertRowid,status:"pending"})});
app.get("/api/my-posts",auth,(req,res)=>res.json(db.prepare("SELECT * FROM citizen_posts WHERE user_id=? ORDER BY datetime(created_at) DESC").all(req.session.userId)));
app.post("/api/upload",auth,upload.single("image"),(req,res)=>req.file?res.json({url:"/uploads/"+req.file.filename}):res.status(400).json({error:"Aucune image."}));
app.post("/api/articles",staff,async(req,res)=>{let{title,content,excerpt,category,image,breaking}=req.body;if(!title||!content)return res.status(400).json({error:"Titre et contenu requis."});let r=db.prepare("INSERT INTO articles(title,content,excerpt,category,image,author_id,breaking) VALUES(?,?,?,?,?,?,?)").run(title,content,excerpt||content.slice(0,220),category||"ActualitÃ©s",image||null,req.session.userId,breaking?1:0);let a=art(r.lastInsertRowid),d=await notifyArticle(a);db.prepare("UPDATE articles SET discord_sent=?,discord_error=? WHERE id=?").run(d.ok?1:0,d.ok?null:d.error,a.id);res.json({article:art(a.id),discord:d})});
app.put("/api/articles/:id",staff,(req,res)=>{let a=art(req.params.id);if(!a)return res.status(404).json({error:"Introuvable."});if(req.session.role!=="admin"&&a.author_id!==req.session.userId)return res.status(403).json({error:"AccÃ¨s refusÃ©."});let{title,content,excerpt,category,image,breaking,published}=req.body;db.prepare("UPDATE articles SET title=?,content=?,excerpt=?,category=?,image=?,breaking=?,published=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(title,content,excerpt||content.slice(0,220),category,image||null,breaking?1:0,published===false?0:1,a.id);res.json({article:art(a.id)})});
app.delete("/api/articles/:id",admin,(req,res)=>{db.prepare("DELETE FROM articles WHERE id=?").run(req.params.id);res.json({ok:true})});
app.post("/api/articles/:id/discord",staff,async(req,res)=>{let a=art(req.params.id),d=await notifyArticle(a);db.prepare("UPDATE articles SET discord_sent=?,discord_error=? WHERE id=?").run(d.ok?1:0,d.ok?null:d.error,a.id);res.json({discord:d})});
app.get("/api/admin/citizen-posts",staff,(req,res)=>res.json(db.prepare("SELECT p.*,u.name user_name,u.email FROM citizen_posts p JOIN users u ON u.id=p.user_id ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END,datetime(p.created_at) DESC").all()));
app.post("/api/admin/citizen-posts/:id/review",staff,(req,res)=>{
    let p=db.prepare(`
        SELECT p.*,u.name author
        FROM citizen_posts p
        JOIN users u ON u.id=p.user_id
        WHERE p.id=?
    `).get(req.params.id);

    if(!p){
        return res.status(404).json({
            error:"Demande introuvable."
        });
    }

    let status=req.body.status==="approved"
        ?"approved"
        :"rejected";

    db.prepare(`
        UPDATE citizen_posts
        SET status=?,
            review_note=?,
            reviewed_at=CURRENT_TIMESTAMP
        WHERE id=?
    `).run(
        status,
        req.body.note || "",
        p.id
    );

    res.json({
        ok:true,
        status:status
    });
});
app.post("/api/admin/events",staff,(req,res)=>{let{title,description,date,time,location,image}=req.body;if(!title||!description||!date)return res.status(400).json({error:"Titre, description et date requis."});let r=db.prepare("INSERT INTO events(title,description,date,time,location,image,created_by) VALUES(?,?,?,?,?,?,?)").run(title,description,date,time||"",location||"",image||null,req.session.userId);res.json({id:r.lastInsertRowid})});
app.delete("/api/admin/events/:id",staff,(req,res)=>{db.prepare("DELETE FROM events WHERE id=?").run(req.params.id);res.json({ok:true})});
app.post("/api/admin/gallery",staff,(req,res)=>{

    let { title, image, caption, youtube } = req.body;

    title = String(title || "").trim();
    image = String(image || "").trim();
    caption = String(caption || "").trim();
    youtube = String(youtube || "").trim();

    if (!title) {
        return res.status(400).json({
            error: "Titre requis."
        });
    }

    if (!image && !youtube) {
        return res.status(400).json({
            error: "Ajoutez une photo ou un lien YouTube."
        });
    }

    if (youtube) {

        const valid =
            youtube.startsWith("https://www.youtube.com/") ||
            youtube.startsWith("https://youtube.com/") ||
            youtube.startsWith("https://youtu.be/");

        if (!valid) {
            return res.status(400).json({
                error: "Lien YouTube invalide."
            });
        }
    }

    const result = db.prepare(`
        INSERT INTO gallery
        (title, image, caption, youtube, author_id)
        VALUES (?, ?, ?, ?, ?)
    `).run(
        title,
        image,
        caption,
        youtube,
        req.session.userId
    );

       res.json({
        id: result.lastInsertRowid
    });
});

app.delete("/api/admin/gallery/:id",staff,(req,res)=>{
    db.prepare("DELETE FROM gallery WHERE id=?").run(req.params.id);
    res.json({ok:true});
});

app.get("/api/admin/stats",staff,(req,res)=>res.json({articles:db.prepare("SELECT COUNT(*) c FROM articles").get().c,views:db.prepare("SELECT COALESCE(SUM(views),0) c FROM articles").get().c,citizens:db.prepare("SELECT COUNT(*) c FROM users WHERE role='citoyen'").get().c,pending:db.prepare("SELECT COUNT(*) c FROM citizen_posts WHERE status='pending'").get().c,events:db.prepare("SELECT COUNT(*) c FROM events WHERE date>=date('now')").get().c,photos:db.prepare("SELECT COUNT(*) c FROM gallery").get().c}));
app.get("/api/users",admin,(req,res)=>res.json(db.prepare("SELECT id,name,email,role,bio,avatar,created_at FROM users ORDER BY id DESC").all()));
app.post("/api/users",admin,(req,res)=>{let{name,email,password,role,bio}=req.body;if(!name||!email||!password||!["citoyen","journaliste","admin"].includes(role))return res.status(400).json({error:"DonnÃ©es invalides."});try{let r=db.prepare("INSERT INTO users(name,email,password_hash,role,bio) VALUES(?,?,?,?,?)").run(name,email.toLowerCase(),bcrypt.hashSync(password,12),role,bio||"");res.json({id:r.lastInsertRowid})}catch(e){res.status(400).json({error:"Email dÃ©jÃ Â  utilisÃ©."})}});
app.delete("/api/users/:id",admin,(req,res)=>{if(+req.params.id===+req.session.userId)return res.status(400).json({error:"Impossible de supprimer votre compte."});db.prepare("DELETE FROM users WHERE id=?").run(req.params.id);res.json({ok:true})});
app.use((e,req,res,next)=>res.status(400).json({error:e.message||"Erreur"}));
app.listen(PORT,()=>console.log("Weazel News V4 : http://localhost:"+PORT));


app.get("/api/videos",(req,res)=>{
    res.json(
        db.prepare(`
            SELECT *
            FROM videos
            ORDER BY datetime(created_at) DESC
        `).all()
    );
});

app.get("/api/admin/videos",staff,(req,res)=>{
    res.json(
        db.prepare(`
            SELECT *
            FROM videos
            ORDER BY datetime(created_at) DESC
        `).all()
    );
});

app.post("/api/admin/videos",staff,(req,res)=>{

    let {
        title,
        youtube,
        caption
    } = req.body;

    title = String(title || "").trim();
    youtube = String(youtube || "").trim();
    caption = String(caption || "").trim();

    if (!title || !youtube) {
        return res.status(400).json({
            error:"Titre et lien YouTube requis."
        });
    }

    const valid =
        youtube.startsWith("https://www.youtube.com/") ||
        youtube.startsWith("https://youtube.com/") ||
        youtube.startsWith("https://youtu.be/");

    if (!valid) {
        return res.status(400).json({
            error:"Lien YouTube invalide."
        });
    }

    const result = db.prepare(`
        INSERT INTO videos
        (title,youtube,caption,author_id)
        VALUES (?,?,?,?)
    `).run(
        title,
        youtube,
        caption,
        req.session.userId
    );

    res.json({
        id:result.lastInsertRowid
    });
});

app.delete("/api/admin/videos/:id",staff,(req,res)=>{

    db.prepare(
        "DELETE FROM videos WHERE id=?"
    ).run(req.params.id);

    res.json({
        ok:true
    });
});
