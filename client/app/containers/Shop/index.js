/**
 *
 * Shop
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { Switch, Route } from 'react-router-dom';

import actions from '../../actions';

import ProductsShop from '../ProductsShop';
import BrandsShop from '../BrandsShop';

import Page404 from '../../components/Page404';

class Shop extends React.PureComponent {
  componentDidMount() {
    document.body.classList.add('shop-page');
  }

  componentWillUnmount() {
    document.body.classList.remove('shop-page');
  }

  render() {
    return (
      <div className='shop'>
        <Switch>
          <Route exact path='/shop' component={ProductsShop} />
          <Route path='/shop/category/:slug' component={ProductsShop} />
          <Route path='/shop/brand/:slug' component={BrandsShop} />
          <Route path='*' component={Page404} />
        </Switch>
      </div>
    );
  }
}

const mapStateToProps = state => {
  return {};
};

export default connect(mapStateToProps, actions)(Shop);
