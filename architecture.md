GitHub
   │
   │ Clone existing Java application
   ▼
Local Git Bash
   │
   │ Remove GitHub remote
   │ Add Bitbucket remote
   ▼
Bitbucket Repository
   │
   │ Source code change
   ▼
AWS CodePipeline
   │
   ▼
AWS CodeBuild
   │
   │ Build Java application
   ▼
S3
   │
   │ Build artifact
   ▼
AWS Elastic Beanstalk
   │
   ├── Java Application
   │
   └── EC2 instances underneath
   │
   ▼
Application URL
   │
   ▼
Java Website
   │
   └──────────────► AWS RDS
                    Database