# ☸️ What is Kubernetes?

Kubernetes is an open-source platform that automatically deploys, manages, scales, and maintains containerized applications.

Simply put:

> Docker packages your application into containers, while Kubernetes manages those containers, especially when you have many of them running across multiple servers.

Kubernetes is often shortened to K8s. The “8” represents the eight letters between K and s in Kubernetes.

## 1. 🏢 Simple analogy: Managing a hotel

Imagine you own a hotel with hundreds of rooms. Each room represents a container running an application.

You need someone to:

* Make sure rooms are available for guests.

* Open more rooms when more guests arrive.

* Replace rooms that become unusable.

* Distribute guests across available rooms.

* Ensure the hotel continues operating.

Kubernetes is like the hotel manager who coordinates everything automatically.

![Medium](https://images.openai.com/static-rsc-4/2vDFHqyK4Ad75qM6I0kvMzisyI8KXCe4CDNovVnj7h7ApF4WO5TFPnuIl19pZQdgtU9Ov4Lft6WFBmPw5P4WIKIoAr96je-FqmzhU0VBEJVQcofJwR9XP_0M3LDrRNiAuBIPZ2-stdAm_H46XxRLyIrAi4y0B_tMvgSs4tCe5f0?purpose=inline)

![Step-by-Step Guide to Integrating New Relic in DevOps Pipelines](https://images.openai.com/static-rsc-4/2fDmVOF-znTBPn3aeGXU7Xn90M0TbNqGJAmMc51fs9WxpPaDGGmFWkzLb1WqTKVxu22Meqku-ur4JlXJFVuf64FrWZnVyMCvz5pjn_AntxjmT2cJFjWPmqHkDw3BfVGcmv0_sC07xlVrC27spEohuwjYjI1Iz2h-x5GGOJS0nk0?purpose=inline)

![Kubernetes — Actual Working Flow. Kubernetes Basics — Part 1 | by Pranav Bakare | Mar, 2026 | Medium](https://images.openai.com/static-rsc-4/g3hBI_6takqkd-MJvo8wMAfErVFfNy8gI8JhRR4k3WC-8ztrLvyVupz5XSeY4EybKwWqnjPMP1QTAQaaZz4foHrn_n8rPiyQse0_c_xO3Te5GabBcE6OldxnNYkzo7sxkt3f7H8GsRIl3nJrBvd4upJ8B5_3S6KHBJ7BhDYANHM?purpose=inline)

7

## 2. Why do we need Kubernetes?

Imagine you've deployed your application using Docker.

Initially, you have one container:

```
User
  |
  v
Docker Container
  |
  v
Application
```

As your application grows, you might need multiple containers:

```
             Users
               |
               v
         Load Balancer
          /     |     \
         v      v      v
      App 1   App 2   App 3
```

Now you need to manage those containers. What happens if App 2 crashes? What if thousands of users visit your website?

Kubernetes helps automate these tasks.

* Self-healing: Restarts or replaces failed containers to maintain the desired state.

* Scaling: Increases or decreases the number of application replicas.

* Load balancing: Distributes traffic across available application instances.

* Rolling updates: Releases new versions gradually.

* Service discovery: Helps applications find and communicate with one another.

## 3. Important Kubernetes components

Think of Kubernetes as a company with a manager and workers.

Control Plane

The manager that makes decisions about the cluster.

Worker Nodes

The machines that run your applications.

Pod 1

Application container(s)

Pod 2

Application container(s)

Here are the key terms you should know:

| Component     | Simple meaning                                                                    |
| ------------- | --------------------------------------------------------------------------------- |
| Cluster       | The whole Kubernetes environment                                                  |
| Node          | A machine that runs workloads                                                     |
| Pod           | The smallest deployable unit; contains one or more containers                     |
| Deployment    | Defines the desired number of application replicas and manages updates            |
| Service       | Provides a stable network endpoint for accessing Pods                             |
| Ingress       | Routes HTTP/HTTPS traffic into a cluster, when an Ingress controller is installed |
| Control Plane | Coordinates and manages the cluster                                               |

### How they work together

```
Kubernetes Cluster
       |
       +-- Control Plane
       |      |
       |      +-- Schedules workloads
       |      +-- Monitors desired state
       |
       +-- Worker Node
              |
              +-- Deployment
                     |
                     +-- Pod 1
                     +-- Pod 2
                     +-- Pod 3
```

For example, if your Deployment specifies three replicas and one Pod fails, Kubernetes works to restore the desired number of replicas.

## 4. How Kubernetes works with Docker

Suppose you build a React frontend and Node.js backend.

The workflow could look like this:

GitHub

Store your source code

Jenkins / GitHub Actions

Build and test the application

Docker

Build container images

Container Registry

Store images, e.g. Amazon ECR

Kubernetes

Deploy and manage containers

Remember: Kubernetes doesn't require Docker Engine specifically. It can run containers through compatible runtimes, commonly containerd.

## 5. Kubernetes vs Docker vs Amazon ECS

These tools have different roles.

| Tool       | Main purpose                                |
| ---------- | ------------------------------------------- |
| Docker     | Builds images and runs containers           |
| Kubernetes | Orchestrates containers across a cluster    |
| Amazon ECS | AWS-managed container orchestration service |
| Amazon EKS | AWS-managed Kubernetes service              |

If you're deploying containers on AWS, you might choose ECS for AWS-native orchestration or EKS if you want Kubernetes.

## 6. Practical example

Imagine your online store normally needs three application replicas.

You define that desired state in a Kubernetes Deployment:

YAML

```
apiVersion: apps/v1
kind: Deployment
metadata:
  name: store-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: store
  template:
    metadata:
      labels:
        app: store
    spec:
      containers:
        - name: store
          image: nginx:alpine
          ports:
            - containerPort: 80
```

Save it as `deployment.yaml`, then run:

Bash

```
kubectl apply -f deployment.yaml
```

Kubernetes works to maintain three replicas of the application.

Check the result with:

Bash

```
kubectl get deployments
kubectl get pods
kubectl get nodes
```

Here, `kubectl` is the command-line tool you use to communicate with a Kubernetes cluster.

## 🎯 Interview definition

> Kubernetes is an open-source container orchestration platform that automates the deployment, scaling, networking, and lifecycle management of containerized applications across a cluster of machines.

### 🧠 Memory trick

* Docker = Packages the application.

* Kubernetes = Manages the containers.

* Terraform = Creates the infrastructure.

* Ansible = Configures servers.

* Jenkins / GitHub Actions = Automates the delivery pipeline.

* Prometheus and Grafana = Help monitor application and infrastructure health.

Your DevOps goal: Learn to build an application, containerize it with Docker, deploy it with Kubernetes, automate delivery through CI/CD, and monitor it in production. That combination will give you valuable practical experience for junior DevOps and Cloud Engineering roles.
