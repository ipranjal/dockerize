<?php
use Scrawler\App;

$app = new App();

$app->get('/',function(){
  return 'Hello World';
});

$app->run();