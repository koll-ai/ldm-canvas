import functions_framework
from googleapiclient import discovery

@functions_framework.http
def status_vm(request):
    compute = discovery.build('compute', 'v1')
    instance = compute.instances().get(project='ai-canvas', zone='europe-west1-b', instance='my-gpu').execute()

    return instance["status"]