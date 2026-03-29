# ComputeShare

ComputeShare is a lightweight federated machine learning training system using PyTorch. It distributes training tasks across multiple Macs over the internet, utilizing native MPS (Metal Performance Shaders) acceleration to split workloads and drastically reduce training time.

---

## Features

* Distributed Bulk Synchronous Parallel training architecture
* **Linear Scaling Rule** to prevent mathematical decay in multi-node setups
* **Stale Gradients Rejection** to protect global weights from slow workers 
* Built-in connection continuity and extended timeouts for network stability
* Gzip binary compression of gradients to minimize network overhead
* Secure external HTTP communication via mandatory 4-digit PIN authentication

---

## Architecture

The system operates with two primary components:

* **Parameter Server (`server.py`)**: The central node holding the global PyTorch model. It waits for workers to submit their computed gradients, decompresses the payloads, mathematically averages them via SGD, and updates the global weights. 
* **Workers (`worker.py`)**: Distributed clients that pull the latest model from the server, process a mathematical shard of the dataset using their local GPU, and submit the calculated vectors back.

---

## Setup

Before running the system, initialize the Python environment and install the required dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

---

## Usage Guide

**1. Initialize the Parameter Server**

Designate one machine to act as the parameter server. 

Interactive:
```bash
python server.py --pin 1234
```
Inline:
```bash
python server.py --pinSizEpo <PIN> <WORLD_SIZE> <TOTAL_GLOBAL_BATCHES>
```
*(Note: To allow external connections, expose port 8000 using LocalTunnel: `npx -y localtunnel --port 8000`)*

**2. Connect the Workers**

On any participating machine, execute the worker script.

Interactive:
```bash
python worker.py --pin 1234
```
Inline:
```bash
python worker.py --pinSizRanBatEpo <PIN> <WORLD_SIZE> <RANK> <BATCH_SIZE> <TOTAL_GLOBAL_BATCHES>
```
*(Note: Edit `SERVER_URL` in `worker.py` if connecting via LocalTunnel)*

**3. Evaluate the Model**

Once the server reaches the target global batches, the final weights are saved to `trained_model.pth`. Execute the script to evaluate its accuracy:

```bash
python test.py
```
