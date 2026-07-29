#  AWS Multi-Tier Java Web Application Deployment

##  Overview

This project demonstrates the deployment of a **production-inspired, highly available, scalable, and secure multi-tier Java web application** on Amazon Web Services (AWS).

The infrastructure is designed using industry best practices by separating the application into multiple layers:

* Presentation Layer
* Application Layer
* Backend Services Layer

The project also incorporates high availability, load balancing, auto scaling, centralized artifact storage, identity and access management, and DNS routing.

---

#  Architecture

```
                           Internet Users
                                 │
                                 ▼
                          Route 53 DNS
                                 │
                                 ▼
                  Application Load Balancer (ALB)
                                 │
                                 ▼
                        Target Group (HTTP)
                                 │
                  Auto Scaling Group (2-4 EC2)
                                 │
                    Launch Template (Custom AMI)
                                 │
          ┌──────────────────────┴──────────────────────┐
          ▼                                             ▼
     app01 (Tomcat)                               app02 (Tomcat)
     Application Server                          Application Server
          │                                             │
          └───────────────┬─────────────────────────────┘
                          │
                          ▼
                  Amazon S3 (Application Artifact)
                          │
                          ▼
                   vprofile-v2.war
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
      MySQL          Memcached        RabbitMQ
       db01             mc01             rmq01
```

---

#  Project Objectives

* Deploy a Java web application on AWS.
* Build the application using Maven.
* Store application artifacts in Amazon S3.
* Secure AWS resources using IAM Users and IAM Roles.
* Deploy the application to Apache Tomcat.
* Configure backend services.
* Implement an Application Load Balancer.
* Configure Target Groups.
* Configure Route 53 DNS.
* Build a reusable AMI.
* Create a Launch Template.
* Configure an Auto Scaling Group.
* Simulate a production-ready environment.

---

#  AWS Services Used

* Amazon EC2
* Amazon S3
* Amazon Route 53
* Amazon IAM
* Amazon Machine Image (AMI)
* Launch Template
* Target Group
* Application Load Balancer
* Auto Scaling Group
* Security Groups

---

#  Servers

## app01

Purpose

* Apache Tomcat
* Java Application

---

## db01

Purpose

* MySQL Database

---

## mc01

Purpose

* Memcached

---

## rmq01

Purpose

* RabbitMQ Message Broker

---

#  Security Groups

## Elastic Load Balancer Security Group

Allowed Inbound Rules

| Protocol | Port | Source    |
| -------- | ---- | --------- |
| HTTP     | 80   | 0.0.0.0/0 |
| HTTPS    | 443  | 0.0.0.0/0 |

---

## Application Security Group

| Protocol   | Port | Source             |
| ---------- | ---- | ------------------ |
| Custom TCP | 8080 | ELB Security Group |
| SSH        | 22   | My Public IP       |

---

## Backend Security Group

| Service     | Port  | Source         |
| ----------- | ----- | -------------- |
| MySQL       | 3306  | Application SG |
| Memcached   | 11211 | Application SG |
| RabbitMQ    | 5672  | Application SG |
| SSH         | 22    | My Public IP   |
| All Traffic | All   | Backend SG     |

---

#  Building the Application

Clone the project

```bash
git clone <repository-url>
```

Navigate into the project

```bash
cd vprofile-project
```

Build the application

```bash
mvn install
```

or

```bash
mvn package
```

Generated Artifact

```
target/vprofile-v2.war
```

---

#  Upload Artifact to Amazon S3

Configure AWS CLI

```bash
aws configure
```

Upload the WAR file

```bash
aws s3 cp target/vprofile-v2.war s3://YOUR-S3-BUCKET/
```

---

#  IAM Configuration

## IAM User

Purpose

Used on the local development machine to upload application artifacts to Amazon S3.

Permissions

* AmazonS3FullAccess

---

## IAM Role

Purpose

Attached to the Tomcat Application Server.

Allows EC2 to download application artifacts from S3 without storing AWS credentials.

Permissions

* AmazonS3FullAccess

---

#  Deploy Application

Download artifact

```bash
aws s3 cp s3://YOUR-S3-BUCKET/vprofile-v2.war .
```

Deploy

```bash
cp vprofile-v2.war /opt/tomcat/webapps/
```

Restart Tomcat

```bash
systemctl restart tomcat
```

Verify deployment.

---

#  Create Custom AMI

After successful deployment:

* Create a Custom AMI.
* Use the AMI for future application servers.

---

#  Launch Template

Launch Template Configuration

* Custom AMI
* Instance Type
* Key Pair
* Security Group
* IAM Role
* User Data

---

#  Target Group

Configuration

* HTTP
* Port 8080

Health Check

```
/
```

---

#  Application Load Balancer

Listeners

* HTTP (80)
* HTTPS (443)

Forward Requests To

Target Group

---

#  Route 53

Hosted Zone

Example

```
example.com
```

DNS Record

```
app.example.com
```

Alias Target

Application Load Balancer

---

#  Auto Scaling Group

Configuration

Minimum Capacity

```
2
```

Desired Capacity

```
2
```

Maximum Capacity

```
4
```

Scaling Policy

CPU Utilization

---

#  Testing

✔ Build completed successfully

✔ Application uploaded to S3

✔ EC2 downloaded artifact

✔ Tomcat deployed application

✔ Database connectivity verified

✔ Memcached connectivity verified

✔ RabbitMQ connectivity verified

✔ Application accessible through Load Balancer

✔ Route 53 DNS resolved successfully

✔ Auto Scaling launched replacement instances

✔ Target Group health checks passed

---

#  Repository Structure

```
aws-multi-tier-java-web-app/
│
├── README.md
├── architecture/
├── screenshots/
├── scripts/
├── commands.md
├── troubleshooting.md
└── lessons-learned.md
```

---

#  Skills Demonstrated

* Linux Administration
* Bash Scripting
* Git & GitHub
* Apache Tomcat
* Maven
* AWS CLI
* Amazon EC2
* Amazon S3
* IAM Users
* IAM Roles
* Security Groups
* MySQL
* Memcached
* RabbitMQ
* Application Load Balancer
* Target Groups
* Launch Templates
* Amazon Machine Images (AMI)
* Auto Scaling Groups
* Route 53
* High Availability
* Multi-Tier Architecture
* Production Deployment
* Infrastructure Troubleshooting

---

#  Screenshots

Include screenshots of:

* EC2 Instances
* Security Groups
* IAM User
* IAM Role
* S3 Bucket
* Maven Build
* Apache Tomcat
* MySQL
* RabbitMQ
* Memcached
* Target Group
* Application Load Balancer
* Route 53
* Auto Scaling Group
* Browser Output
* Application Dashboard

---

#  Lessons Learned

* Designed and deployed a production-inspired multi-tier architecture.
* Implemented secure communication between application layers using Security Groups.
* Used IAM Roles to provide secure, temporary access to AWS services.
* Built Java applications with Maven and stored artifacts in Amazon S3.
* Configured Application Load Balancer and Target Groups for high availability.
* Implemented Auto Scaling to improve scalability and fault tolerance.
* Used Route 53 to provide a user-friendly domain name for the application.

---

#  Author

**Timilehin Olabisi**

Cloud & DevOps Engineer

Building scalable cloud infrastructure, automation solutions, and production-ready DevOps projects on AWS.

