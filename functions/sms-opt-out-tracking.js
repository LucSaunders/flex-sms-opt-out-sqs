/* global exports, require, console, process, Twilio */
'use strict';

// import { config, SQS } from 'aws-sdk';
const AWS = require('aws-sdk');

export async function handler(context, event, callback) {
  const payload = JSON.parse(event.Payload);
  console.log(`payload.error_code: ${payload.error_code}`);
  console.log(`payload.resource_sid: ${payload.resource_sid}`);

  const client = context.getTwilioClient();
  let stop_sms_data = {};

  try {
    // check for STOP-sms warning
    if(payload.error_code=="80901"){
        console.log("80901 error");
        stop_sms_data = await client.messages(payload.resource_sid)
            .fetch()
        let stop_sms_data_string = JSON.stringify(stop_sms_data)
        console.log(`stop_sms_data_string: ${stop_sms_data_string}`);
    } else {
        callback(null,"");
    }

    // set up stop-sms data tracking and AWS SQS call with aws-sdk
    // await config.update({
    //   accessKeyId: process.env.AWS_KEY,
    //   secretAccessKey: process.env.AWS_SECRET
    // });
    await AWS.config.update({
      accessKeyId: process.env.AWS_KEY,
      secretAccessKey: process.env.AWS_SECRET
  });
  
    // let sqs = new SQS({ region: 'us-east-2' });
    let sqs = new AWS.SQS({ region: 'us-east-2' });

    const res = new Twilio.Response();
        res.appendHeader("Access-Control-Allow-Origin", "*");
        res.appendHeader("Access-Control-Allow-Methods", "OPTIONS POST");
        res.appendHeader("Content-Type", "application/json");
        res.appendHeader("Access-Control-Allow-Headers", "Content-Type");
    let response = { response: true };
    
    //TODO: scrub phone number from e16 "+"?
    let stop_sms_body = {
      PhoneNumber: stop_sms_data.from,
      StopDate: stop_sms_data.dateUpdated
      }
    console.log(`stop_sms_data.from: ${stop_sms_data.from}`);
    console.log(`stop_sms_data.dateUpdated: ${stop_sms_data.dateUpdated}`);


    let sendParameters = {
        MessageBody: JSON.stringify(stop_sms_body),
        QueueUrl: process.env.SMS_STOP_URL
    };

    // let sendParameters = {
    //     MessageBody: JSON.stringify(stop_sms_data),
    //     QueueUrl: SMS_STOP_URL
    // };
    
    await sqs.sendMessage(sendParameters, (err, resp) => {
        console.log(err);
        console.log(resp);
        response.return = resp;
        response.error = err;
        res.setBody(response);
        callback(null, res);
    });

  } catch(error) {
      console.log(error);
      callback(error);
  }
}
