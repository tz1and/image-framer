docker-build:
	docker-compose -f docker-compose.image-framer.yml build --pull

docker-up:
	docker-compose -f docker-compose.image-framer.yml up -d

docker-down:
	docker-compose -f docker-compose.image-framer.yml down -v

docker-logs:
	docker-compose -f docker-compose.image-framer.yml logs -f

docker-push:
	docker save -o image-framer-latest.tar image-framer:latest
	rsync image-framer-latest.tar docker-compose.image-framer.yml nginx.conf tz1and.com:/home/yves/docker
	ssh tz1and.com "source .profile; cd docker; docker load -i image-framer-latest.tar; mv nginx.conf nginx/conf/image-framer.conf"
	rm image-framer-latest.tar
