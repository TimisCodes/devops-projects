                       ┌──────────────────┐
                       │    Bitbucket     │
                       │   Git Repository │
                       └────────┬─────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  AWS CodePipeline│
                       └────────┬─────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │    CodeBuild     │
                       │ Java Build/Test  │
                       └────────┬─────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │    S3 Bucket     │
                       │ Build Artifact   │
                       └────────┬─────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   Elastic Beanstalk   │
                    │    Java Application   │
                    └───────────┬───────────┘
                                │
                         JDBC / DB Connection
                                │
                                ▼
                    ┌───────────────────────┐
                    │        RDS            │
                    │       Database        │
                    └───────────────────────┘

             Security Groups → Control network access
             
             IAM → Controls AWS permissions