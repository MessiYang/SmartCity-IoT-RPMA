import BaseModel from './base/baseModel';
import {mongo as mongoose} from '../config/initializers/database';
import {customer as CustomerType} from './type/RoleType';
import GenderType from './type/GenderType';
//import CountryType from './type/CountryType';

let UnnameModel = new BaseModel({
  code: String,
  // 姓名
  name: {
    type: String,
    trim: true,
    maxlength: [64, '姓名資料長度({VALUE})不符'],
    minlength: [1, '姓名資料長度({VALUE})不符'],
    required: [true, '姓名為必填欄位'],
  },
  // 車牌號碼
  carId: [{
    type: String,
    trim: true,
    maxlength: [16, '姓名資料長度({VALUE})不符'],
    minlength: [1, '姓名資料長度({VALUE})不符'],
    //required: [true, '姓名為必填欄位'],
  }],
  // 暱稱
  nickname: {
    type: String,
    index: true,
    trim: true,
    maxlength: [16, '姓名資料長度({VALUE})不符'],
    minlength: [1, '姓名資料長度({VALUE})不符'],
  },
  // 性別
  gender: {
    type: String,
    enum: GenderType.toValues(),
  },
  // 生日
  birthDate: Date,
  // 身分證號
  personalId: {
    type: String,
    index: true,
    uppercase: true,
    trim: true,
    maxlength: [(64+1+13), '身分證字號資料長度({VALUE})不符'],
    minlength: [3, '身分證字號資料長度({VALUE})不符'],
    required: [true, '身分證字號為必填欄位'],
  },

  // 手機門號
  mobile: {
    type: String,
    index: true,
    trim: true,
    maxlength: [16, '手機號碼資料長度({VALUE})不符'],
    minlength: [9, '手機號碼資料長度({VALUE})不符'],
    required: [true, '手機門號為必填欄位'],
  },
  // 地址
  address: {
    type: String,
    trim: true,
    maxlength: [255, '地址已超出字數上限({MAXLENGTH})']
  },
  // 備註
  memo: {
    type: String,
    trim: true,
    maxlength: [255, '備註已超出字數上限({MAXLENGTH})']
  },
  // 帳號
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    index: true,
  },

  // 授權角色--可複選
  role: [{
    type: Number,
    enum: CustomerType.toValues(),
  }],

  //APN Token for who have iOS
  apnToken:[{
      type: String,
  }],
  apnDebugToken:[{
      type: String,
  }],
  //GCM Token for who have Android
  gcmToken:[{
      type: String,
  }],
  gcmDebugToken:[{
      type: String,
  }],

  //國別
  // country: {
  //   type: String,
  //   enum: CountryType.toValues(),
  // },
  //電子郵件
  email:[{
      type: String,
  }],

  // levelOneId
  levelOneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LevelOne',
    index: true,
  },
  // levelTwoId
  levelTwoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LevelTwo',
    index: true,
  },
  // levelThreeId
  levelThreeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LevelThree',
    index: true,
  },
}, {
  'versionKey': false,
  'collection': 'Customer',
});

module.exports = mongoose.model('Customer', UnnameModel);