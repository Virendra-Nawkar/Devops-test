# BAD Dockerfile — intentionally has many issues for testing
# Upload this to the Dockerfile scanner to see findings
# Expected findings: DL3006, DL3007, DL3009, DL3014, DL3002, DL3020, CKV_DOCKER_2, CKV_DOCKER_3, CKV_DOCKER_4

FROM ubuntu
RUN apt-get update
RUN apt-get install curl wget git python3
ADD https://example.com/file.tar.gz /tmp/
WORKDIR /app
COPY . .
RUN pip3 install flask requests
EXPOSE 5000
USER root
CMD python3 app.py
